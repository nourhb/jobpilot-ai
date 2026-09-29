import { env } from "../config/env";
import { logger } from "../lib/logger";
import { applicationRepository } from "../repositories/application.repository";
import { userRepository } from "../repositories/user.repository";
import { resolveStoredApplyUrl } from "../jobs/applyUrl";

const APPLIED_STATUSES = new Set(["SUBMITTED", "MANUAL_REVIEW", "FAILED"]);

export type ApplicationCopyJob = {
  title: string;
  company: string;
  locationRaw?: string | null;
  remoteType?: string | null;
  applicationUrl?: string | null;
  jobUrl?: string | null;
  description?: string | null;
  rawData?: unknown;
};

export type ApplicationCopyInput = {
  status: string;
  message?: string;
  job: ApplicationCopyJob;
  coverLetter?: { content: string } | null;
  answers?: Array<{ questionText: string; answer: string | null }>;
};

export function uniqueEmails(...values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const value of values) {
    const email = value?.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function buildApplicationCopyEmail(input: ApplicationCopyInput): { subject: string; text: string; html: string } {
  const applyUrl = resolveStoredApplyUrl(input.job);
  const location = [input.job.locationRaw, input.job.remoteType].filter(Boolean).join(" · ") || "Not listed";
  const verb =
    input.status === "SUBMITTED"
      ? "applied to"
      : input.status === "MANUAL_REVIEW"
        ? "prepared an application for"
        : "tried to apply to";
  const subject = `JobPilot ${verb} ${input.job.title} at ${input.job.company}`;

  const answers = input.answers ?? [];
  const answerLines =
    answers.length === 0
      ? "No screening answers were generated."
      : answers
          .map((answer, index) => `${index + 1}. ${answer.questionText}\n${answer.answer?.trim() || "(no answer)"}`)
          .join("\n\n");

  const coverLetter = input.coverLetter?.content.trim() || "No cover letter was generated.";

  const text = [
    `JobPilot ${verb} this role.`,
    "",
    `Status: ${input.status}`,
    `Title: ${input.job.title}`,
    `Company: ${input.job.company}`,
    `Location: ${location}`,
    `Apply URL: ${applyUrl ?? "None on file"}`,
    input.message ? `Note: ${input.message}` : null,
    "",
    "Cover letter",
    "------------",
    coverLetter,
    "",
    "Answers",
    "-------",
    answerLines,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const htmlAnswers =
    answers.length === 0
      ? "<p>No screening answers were generated.</p>"
      : `<ol>${answers
          .map(
            (answer) =>
              `<li><p><strong>${escapeHtml(answer.questionText)}</strong></p><p>${escapeHtml(answer.answer?.trim() || "(no answer)")}</p></li>`,
          )
          .join("")}</ol>`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.5">
  <p>JobPilot ${escapeHtml(verb)} this role.</p>
  <p>
    <strong>Status:</strong> ${escapeHtml(input.status)}<br>
    <strong>Title:</strong> ${escapeHtml(input.job.title)}<br>
    <strong>Company:</strong> ${escapeHtml(input.job.company)}<br>
    <strong>Location:</strong> ${escapeHtml(location)}<br>
    <strong>Apply URL:</strong> ${applyUrl ? `<a href="${escapeHtml(applyUrl)}">${escapeHtml(applyUrl)}</a>` : "None on file"}
    ${input.message ? `<br><strong>Note:</strong> ${escapeHtml(input.message)}` : ""}
  </p>
  <h2>Cover letter</h2>
  <pre style="white-space:pre-wrap;font-family:Georgia,serif">${escapeHtml(coverLetter)}</pre>
  <h2>Answers</h2>
  ${htmlAnswers}
</body></html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendViaSmtp(to: string[], subject: string, text: string, html: string): Promise<boolean> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return false;
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: to.join(", "),
    subject,
    text,
    html,
  });
  return true;
}

async function sendViaResend(to: string[], subject: string, text: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.SMTP_FROM || "JobPilot <onboarding@resend.dev>",
      to,
      subject,
      text,
      html,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the copy email (${response.status}): ${detail.slice(0, 200)}`);
  }
  return true;
}

async function sendViaFormSubmit(to: string, subject: string, text: string): Promise<boolean> {
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: "JobPilot",
      email: "applications@jobpilot.ai",
      _subject: subject,
      _template: "box",
      _captcha: "false",
      message: text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`FormSubmit rejected the copy email (${response.status}): ${detail.slice(0, 200)}`);
  }
  return true;
}

export async function deliverApplicationCopy(to: string[], subject: string, text: string, html: string): Promise<string> {
  if (to.length === 0) throw new Error("No application-copy recipients.");
  if (await sendViaSmtp(to, subject, text, html)) return "smtp";
  if (await sendViaResend(to, subject, text, html)) return "resend";
  await sendViaFormSubmit(to[0]!, subject, text);
  return "formsubmit";
}

export async function sendApplicationCopy(applicationId: string, message?: string): Promise<void> {
  if (env.NODE_ENV === "test") return;

  try {
    const application = await applicationRepository.findById(applicationId);
    if (!application?.job) return;
    if (!APPLIED_STATUSES.has(application.status)) return;

    const user = await userRepository.findById(application.userId);
    const to = uniqueEmails(env.APPLICATION_COPY_EMAIL, user?.email);
    const copy = buildApplicationCopyEmail({
      status: application.status,
      message,
      job: application.job,
      coverLetter: application.coverLetter,
      answers: application.answers,
    });

    const channel = await deliverApplicationCopy(to, copy.subject, copy.text, copy.html);
    logger.info(
      { applicationId, status: application.status, channel, recipientCount: to.length },
      "Sent application copy email",
    );
  } catch (error) {
    logger.error({ err: error, applicationId }, "Failed to send application copy email");
  }
}

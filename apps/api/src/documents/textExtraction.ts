import { normalizeResumeText } from "@jobpilot/ai";
import type { ResumeFileKind } from "./fileValidation";

/**
 * `pdf-parse` and `mammoth` are the only two new runtime dependencies
 * introduced in Phase 2: both are pure-JS (no native build step, which
 * matters given the native-Windows Prisma issues already hit in this
 * project -- see docs/deployment.md), actively maintained, and do exactly
 * one narrow job each (PDF text extraction / DOCX -> text) rather than
 * pulling in a general-purpose document-conversion suite.
 *
 * PDF extractors often flatten columns and emit form-feeds / odd dashes.
 * We normalize that text before the heuristic parser sees it so section
 * headers and date ranges survive real CV layouts.
 */
export async function extractResumeText(buffer: Buffer, kind: ResumeFileKind): Promise<string> {
  const raw = kind === "pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);
  return normalizeResumeText(raw);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

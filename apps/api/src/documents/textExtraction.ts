import type { ResumeFileKind } from "./fileValidation";

/**
 * `pdf-parse` and `mammoth` are the only two new runtime dependencies
 * introduced in Phase 2: both are pure-JS (no native build step, which
 * matters given the native-Windows Prisma issues already hit in this
 * project -- see docs/deployment.md), actively maintained, and do exactly
 * one narrow job each (PDF text extraction / DOCX -> text) rather than
 * pulling in a general-purpose document-conversion suite.
 */
export async function extractResumeText(buffer: Buffer, kind: ResumeFileKind): Promise<string> {
  if (kind === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

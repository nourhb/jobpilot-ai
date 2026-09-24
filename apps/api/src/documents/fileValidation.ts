import path from "node:path";
import { AppError } from "../middleware/errorHandler";

/** Section 52: CV upload security. */
export const MAX_RESUME_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_MIME_TO_EXTENSION: Record<string, string> = {
  [PDF_MIME]: ".pdf",
  [DOCX_MIME]: ".docx",
};

const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // DOCX is a ZIP container

function hasSignature(buffer: Buffer, signature: Buffer): boolean {
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}

export interface UploadedFileInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export type ResumeFileKind = "pdf" | "docx";

/**
 * Validates MIME type, extension, magic-byte file signature, and size
 * (section 52). Throws `AppError` (400) with a specific, useful reason on
 * any mismatch -- never trusts the browser-reported MIME type or the
 * original filename alone.
 */
export function validateResumeUpload(input: UploadedFileInput): ResumeFileKind {
  if (input.buffer.length === 0) {
    throw new AppError(400, "EMPTY_FILE", "The uploaded file is empty.");
  }

  if (input.buffer.length > MAX_RESUME_FILE_SIZE_BYTES) {
    throw new AppError(400, "FILE_TOO_LARGE", `File exceeds the maximum size of 10 MB.`);
  }

  const expectedExtension = ALLOWED_MIME_TO_EXTENSION[input.mimeType];
  if (!expectedExtension) {
    throw new AppError(
      400,
      "UNSUPPORTED_FILE_TYPE",
      `Unsupported file type "${input.mimeType}". Only PDF and DOCX are accepted.`,
    );
  }

  const actualExtension = path.extname(input.originalName).toLowerCase();
  if (actualExtension !== expectedExtension) {
    throw new AppError(
      400,
      "EXTENSION_MISMATCH",
      `File extension "${actualExtension}" does not match declared type "${input.mimeType}".`,
    );
  }

  if (input.mimeType === PDF_MIME) {
    if (!hasSignature(input.buffer, PDF_SIGNATURE)) {
      throw new AppError(400, "INVALID_FILE_SIGNATURE", "File does not appear to be a valid PDF.");
    }
    return "pdf";
  }

  if (!hasSignature(input.buffer, ZIP_SIGNATURE)) {
    throw new AppError(400, "INVALID_FILE_SIGNATURE", "File does not appear to be a valid DOCX.");
  }
  return "docx";
}

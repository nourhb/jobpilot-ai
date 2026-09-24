import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { MAX_RESUME_FILE_SIZE_BYTES } from "../documents/fileValidation";
import { AppError } from "./errorHandler";

/**
 * Memory storage: files are held in a Buffer only for the duration of the
 * request, never written to a temp path multer manages itself. Only the
 * size limit is enforced here -- the real MIME/extension/magic-byte
 * signature validation happens in `documents/fileValidation.ts` so there
 * is exactly one place that decides whether a file is acceptable, with
 * one precise error message per reason.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE_BYTES, files: 1 },
});

/**
 * Wraps multer's single-file middleware so its errors become our
 * standard `AppError` JSON shape instead of falling through to the
 * generic 500 handler.
 */
export function singleResumeUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new AppError(400, "FILE_TOO_LARGE", "File exceeds the maximum size of 10 MB."));
        return;
      }
      next(new AppError(400, "UPLOAD_ERROR", err.message));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    if (!req.file) {
      next(new AppError(400, "NO_FILE_UPLOADED", "No file was uploaded. Include a 'file' field."));
      return;
    }
    next();
  });
}

import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

/**
 * Singleton PrismaClient. Controllers must never import this directly
 * (Cursor rule #5/#6) -- only repositories may.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

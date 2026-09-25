import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { env } from "../config/env";

const PREFIX = "v1";

function key(): Buffer {
  return scryptSync(env.ENCRYPTION_KEY, "jobpilot-field-v1", 32);
}

/**
 * AES-256-GCM helper for field-level encryption (section 51/86).
 * Existing Profile/User columns stay plaintext -- migrating them would
 * break the Truth Layer's verified-field comparisons. New secrets can
 * use this without a schema rewrite.
 */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptField(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== PREFIX || !ivPart || !tagPart || !dataPart) {
    throw new Error("Unrecognized encrypted payload.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}

import { describe, expect, it } from "vitest";
import { decryptField, encryptField } from "./crypto";

describe("encryptField / decryptField", () => {
  it("round-trips a string", () => {
    const encrypted = encryptField("555-0100");
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(encrypted).not.toContain("555-0100");
    expect(decryptField(encrypted)).toBe("555-0100");
  });

  it("produces a different ciphertext each call", () => {
    expect(encryptField("same")).not.toBe(encryptField("same"));
  });

  it("rejects a tampered payload", () => {
    const encrypted = encryptField("secret");
    const parts = encrypted.split(".");
    const data = parts[3] ?? "";
    parts[3] = `${data.slice(0, -1)}${data.endsWith("A") ? "B" : "A"}`;
    expect(() => decryptField(parts.join("."))).toThrow();
  });
});

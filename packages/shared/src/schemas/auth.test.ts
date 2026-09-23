import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      email: "Jane.Doe@Example.com",
      password: "StrongPass123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // email is normalized to lowercase
      expect(result.data.email).toBe("jane.doe@example.com");
    }
  });

  it("rejects a weak password", () => {
    const result = registerSchema.safeParse({
      email: "jane@example.com",
      password: "weak",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "StrongPass123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing first name", () => {
    const result = registerSchema.safeParse({
      email: "jane@example.com",
      password: "StrongPass123",
      firstName: "",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "anything",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

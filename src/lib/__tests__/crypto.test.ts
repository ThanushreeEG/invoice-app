import { describe, it, expect, beforeEach } from "vitest";

// Set encryption key before importing
const TEST_KEY = "a".repeat(64); // 32 bytes in hex
beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe("crypto", () => {
  it("encrypts and decrypts a string", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const original = "my-secret-password-123";
    const encrypted = encrypt(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertexts for same input (random IV)", async () => {
    const { encrypt } = await import("../crypto");
    const enc1 = encrypt("same-password");
    const enc2 = encrypt("same-password");
    expect(enc1).not.toBe(enc2);
  });

  it("returns empty string for empty input", async () => {
    const { decrypt } = await import("../crypto");
    expect(decrypt("")).toBe("");
  });

  it("returns plain text if not in encrypted format (migration)", async () => {
    const { decrypt } = await import("../crypto");
    expect(decrypt("plain-text-password")).toBe("plain-text-password");
  });

  it("throws if ENCRYPTION_KEY is not set", async () => {
    delete process.env.ENCRYPTION_KEY;
    // Need fresh import to re-evaluate
    const crypto = await import("../crypto");
    expect(() => crypto.encrypt("test")).toThrow("ENCRYPTION_KEY");
  });
});

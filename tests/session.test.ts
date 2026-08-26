import { afterEach, describe, expect, it, vi } from "vitest";

import { createSessionToken, verifySessionToken } from "@/lib/session";

const NOW = 1_800_000_000_000;
const SECRET = "01234567890123456789012345678901";

const configure = (secret = SECRET) => {
  vi.stubEnv("MXROUTE_SERVER", "mail.example.test");
  vi.stubEnv("MXROUTE_USERNAME", "admin@example.test");
  vi.stubEnv("MXROUTE_API_KEY", "api-key");
  vi.stubEnv("ADMIN_PASSWORD", "admin-password");
  vi.stubEnv("SESSION_SECRET", secret);
};

afterEach(() => vi.unstubAllEnvs());

describe("signed sessions", () => {
  it("accepts a valid token", () => {
    configure();
    expect(verifySessionToken(createSessionToken(NOW), NOW)).toBe(true);
  });

  it("rejects a modified signature", () => {
    configure();
    const token = createSessionToken(NOW);
    const replacement = token.endsWith("A") ? "B" : "A";
    expect(verifySessionToken(token.slice(0, -1) + replacement, NOW)).toBe(false);
  });

  it("rejects an expired token", () => {
    configure();
    const token = createSessionToken(NOW);
    expect(verifySessionToken(token, NOW + 12 * 60 * 60 * 1000 + 1)).toBe(false);
  });

  it("rejects a malformed token", () => {
    configure();
    expect(verifySessionToken("not-a-token", NOW)).toBe(false);
  });

  it("rejects non-canonical base64url", () => {
    configure();
    expect(verifySessionToken(`${createSessionToken(NOW)}!`, NOW)).toBe(false);
  });

  it("expires at the stated expiry", () => {
    configure();
    expect(verifySessionToken(createSessionToken(NOW), NOW + 12 * 60 * 60 * 1000)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    configure();
    const token = createSessionToken(NOW);
    configure("abcdefghijklmnopqrstuvwxyz123456");
    expect(verifySessionToken(token, NOW)).toBe(false);
  });
});

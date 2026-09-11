import { describe, expect, it } from "vitest";

import { loadConfig } from "@/lib/config";

const validEnv = (
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv =>
  ({
    MXROUTE_SERVER: "mail.example.test",
    MXROUTE_USERNAME: "admin@example.test",
    MXROUTE_API_KEY: "api-key",
    ADMIN_PASSWORD: "admin-password",
    SESSION_SECRET: "01234567890123456789012345678901",
    ...overrides,
  }) as NodeJS.ProcessEnv;

describe("loadConfig", () => {
  it("names a missing required key", () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/MXROUTE_SERVER/);
  });

  it("returns null oidc when no OIDC vars are set", () => {
    const config = loadConfig(validEnv());
    expect(config.oidc).toBeNull();
  });

  it("rejects partial OIDC configuration", () => {
    expect(() =>
      loadConfig(validEnv({ OIDC_ISSUER_URL: "https://id.example.test" })),
    ).toThrow(/OIDC_CLIENT_ID/);
  });

  it("parses full OIDC configuration and strips trailing slash", () => {
    const config = loadConfig(
      validEnv({
        OIDC_ISSUER_URL: "https://id.example.test/",
        OIDC_CLIENT_ID: "mx-alias",
        OIDC_CLIENT_SECRET: "secret-value",
        OIDC_ALLOWED_EMAIL: "admin@example.test",
      }),
    );
    expect(config.oidc).toEqual({
      issuerUrl: "https://id.example.test",
      clientId: "mx-alias",
      clientSecret: "secret-value",
      allowedEmail: "admin@example.test",
    });
  });

  it("rejects a short session secret", () => {
    expect(() => loadConfig(validEnv({ SESSION_SECRET: "short" }))).toThrow(
      /SESSION_SECRET/,
    );
  });

  it("returns only immutable application configuration", () => {
    const config = loadConfig(validEnv());

    expect(config.mxrouteServer).toBe("mail.example.test");
    expect(config).not.toHaveProperty("env");
    expect(Object.isFrozen(config)).toBe(true);
  });
});

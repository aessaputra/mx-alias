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

import { describe, expect, it } from "vitest";

import { isEmailAllowed } from "@/lib/oidc";

describe("isEmailAllowed", () => {
  it("matches case-insensitively", () => {
    expect(isEmailAllowed("Admin@Example.Test", "admin@example.test")).toBe(true);
  });

  it("rejects other emails", () => {
    expect(isEmailAllowed("stranger@example.test", "admin@example.test")).toBe(false);
  });
});

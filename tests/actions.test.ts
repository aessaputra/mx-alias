import { describe, expect, it, vi } from "vitest";

import {
  createAlias,
  deleteAlias,
  login,
  type ActionDependencies,
} from "@/app/actions";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const deps = (overrides: Partial<ActionDependencies> = {}): ActionDependencies => ({
  adminPassword: "correct horse",
  createSessionToken: () => "signed-token",
  verifySessionToken: (token) => token === "valid",
  assertSameOrigin: () => undefined,
  listDomains: async () => ["example.com"],
  createForwarder: vi.fn(async () => undefined),
  deleteForwarder: vi.fn(async () => undefined),
  ...overrides,
});

describe("action core handlers", () => {
  it("returns a generic login failure", async () => {
    expect(await login(form({ password: "wrong" }), deps())).toEqual({ ok: false, message: "Invalid credentials" });
  });

  it("creates a token for valid login", async () => {
    expect(await login(form({ password: "correct horse" }), deps())).toEqual({ ok: true, token: "signed-token" });
  });

  it.each([createAlias, deleteAlias])("rejects unauthenticated mutations", async (handler) => {
    expect(await handler(form({ domain: "example.com", alias: "test", destination: "to@example.net" }), "bad", new Headers(), deps())).toEqual({ ok: false, message: "Authentication required" });
  });

  it("rejects a foreign origin", async () => {
    const dependencies = deps({ assertSameOrigin: () => { throw new Error("foreign"); } });
    expect(await createAlias(form({ domain: "example.com", alias: "test", destination: "to@example.net" }), "valid", new Headers(), dependencies)).toEqual({ ok: false, message: "Request rejected" });
  });

  it("rejects a domain absent from the refreshed domain list", async () => {
    expect(await createAlias(form({ domain: "stale.example", alias: "test", destination: "to@example.net" }), "valid", new Headers(), deps())).toEqual({ ok: false, message: "Domain is not allowed" });
  });

  it("creates with exactly one validated destination", async () => {
    const createForwarder = vi.fn(async () => undefined);
    expect(await createAlias(form({ domain: "example.com", alias: " Test ", destination: "to@example.net" }), "valid", new Headers(), deps({ createForwarder }))).toEqual({ ok: true, message: "Alias created" });
    expect(createForwarder).toHaveBeenCalledOnce();
    expect(createForwarder).toHaveBeenCalledWith("example.com", "test", "to@example.net");
  });

  it("does not retry deletion", async () => {
    const deleteForwarder = vi.fn(async () => { throw new Error("failure"); });
    expect(await deleteAlias(form({ domain: "example.com", alias: "test" }), "valid", new Headers(), deps({ deleteForwarder }))).toEqual({ ok: false, message: "Unable to delete alias" });
    expect(deleteForwarder).toHaveBeenCalledOnce();
  });
});

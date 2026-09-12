import { describe, expect, it, vi } from "vitest";

import {
  comparePassword,
  createAlias,
  deleteAlias,
  generateAlias,
  type ActionDependencies,
} from "@/app/action-handlers";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const deps = (overrides: Partial<ActionDependencies> = {}): ActionDependencies => ({
  adminPassword: "correct horse",
  comparePassword: (submitted, expected) => submitted === expected,
  createSessionToken: () => "signed-token",
  verifySessionToken: (token) => token === "valid",
  assertSameOrigin: () => undefined,
  listDomains: async () => ["example.com"],
  disallowedDomains: [],
  createForwarder: vi.fn(async () => undefined),
  deleteForwarder: vi.fn(async () => undefined),
  ...overrides,
});

describe("real password comparison", () => {
  it("accepts the exact password", () => {
    expect(comparePassword("correct horse", "correct horse")).toBe(true);
  });

  it("rejects wrong, empty, and non-string submissions", () => {
    expect(comparePassword("wrong", "correct horse")).toBe(false);
    expect(comparePassword("", "correct horse")).toBe(false);
    expect(comparePassword(undefined, "correct horse")).toBe(false);
    expect(comparePassword(new Blob(["wrong"]), "correct horse")).toBe(false);
  });
});

describe("alias generation happy path", () => {
  it("returns a generated alias for authenticated sessions", () => {
    const result = generateAlias("valid", deps());
    expect(result).toMatchObject({ ok: true, message: "Alias generated" });
    expect(result.alias).toMatch(/^[a-z]+-[a-z]+-\d{3}$/);
  });
});

describe("create alias validation branches", () => {
  const valid = { domain: "example.com", alias: "test", destination: "to@example.net" };

  it("rejects an invalid alias without calling MXroute", async () => {
    const createForwarder = vi.fn(async () => undefined);
    const result = await createAlias(
      form({ ...valid, alias: "BAD ALIAS!" }),
      "valid",
      new Headers(),
      deps({ createForwarder }),
    );
    expect(result).toEqual({
      ok: false,
      message: "Alias must be 1-64 lowercase letters, numbers, dots, underscores, or hyphens",
    });
    expect(createForwarder).not.toHaveBeenCalled();
  });

  it("rejects an invalid destination without calling MXroute", async () => {
    const createForwarder = vi.fn(async () => undefined);
    const result = await createAlias(
      form({ ...valid, destination: "not-an-address" }),
      "valid",
      new Headers(),
      deps({ createForwarder }),
    );
    expect(result).toEqual({ ok: false, message: "Destination must be one valid email address" });
    expect(createForwarder).not.toHaveBeenCalled();
  });

  it("returns a generic failure when the domain list is unavailable", async () => {
    const result = await createAlias(
      form(valid),
      "valid",
      new Headers(),
      deps({ listDomains: async () => { throw new Error("down"); } }),
    );
    expect(result).toEqual({ ok: false, message: "Unable to create alias" });
  });

  it("does not retry a failed creation", async () => {
    const createForwarder = vi.fn(async () => { throw new Error("down"); });
    const result = await createAlias(form(valid), "valid", new Headers(), deps({ createForwarder }));
    expect(result).toEqual({ ok: false, message: "Unable to create alias" });
    expect(createForwarder).toHaveBeenCalledOnce();
  });
});

describe("delete alias failures", () => {
  it("returns a generic failure when the domain list is unavailable", async () => {
    const result = await deleteAlias(
      form({ domain: "example.com", alias: "test" }),
      "valid",
      new Headers(),
      deps({ listDomains: async () => { throw new Error("down"); } }),
    );
    expect(result).toEqual({ ok: false, message: "Unable to delete alias" });
  });

  it("rejects an invalid alias without calling MXroute", async () => {
    const deleteForwarder = vi.fn(async () => undefined);
    const result = await deleteAlias(
      form({ domain: "example.com", alias: "BAD!" }),
      "valid",
      new Headers(),
      deps({ deleteForwarder }),
    );
    expect(result.ok).toBe(false);
    expect(deleteForwarder).not.toHaveBeenCalled();
  });
});

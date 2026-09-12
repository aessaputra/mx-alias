import { describe, expect, it, vi } from "vitest";

import {
  refreshDashboard,
  REFRESH_COOLDOWN_MS,
  type ActionDependencies,
  type RefreshDeps,
} from "@/app/action-handlers";
import { MxrouteError } from "@/lib/mxroute";

const deps = (overrides: Partial<ActionDependencies & RefreshDeps> = {}): ActionDependencies & RefreshDeps => ({
  adminPassword: "correct horse",
  comparePassword: (submitted, expected) => submitted === expected,
  createSessionToken: () => "signed-token",
  verifySessionToken: (token) => token === "valid",
  assertSameOrigin: () => undefined,
  listDomains: async () => ["example.com", "other.test"],
  disallowedDomains: [],
  createForwarder: vi.fn(async () => undefined),
  deleteForwarder: vi.fn(async () => undefined),
  invalidateDomain: vi.fn(),
  invalidateDomains: vi.fn(),
  ...overrides,
});

describe("refresh dashboard", () => {
  it("rejects unauthenticated refresh", async () => {
    const listDomains = vi.fn(async () => []);
    expect(
      await refreshDashboard("example.com", "bad", new Headers(), deps({ listDomains })),
    ).toEqual({ ok: false, message: "Authentication required" });
    expect(listDomains).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin", async () => {
    const dependencies = deps({ assertSameOrigin: () => { throw new Error("foreign"); } });
    expect(
      await refreshDashboard("example.com", "valid", new Headers(), dependencies),
    ).toEqual({ ok: false, message: "Request rejected" });
  });

  it("invalidates domains and the active domain", async () => {
    const invalidateDomain = vi.fn();
    const invalidateDomains = vi.fn();
    const recordRefresh = vi.fn();
    const dependencies = deps({
      listDomains: async () => ["example.com", "denied.test"],
      disallowedDomains: ["denied.test"],
      invalidateDomain,
      invalidateDomains,
      recordRefresh,
      now: () => 1_000,
    });

    const result = await refreshDashboard("example.com", "valid", new Headers(), dependencies);

    expect(result).toEqual({ ok: true, message: "Dashboard refreshed" });
    expect(invalidateDomains).toHaveBeenCalledOnce();
    expect(invalidateDomain).toHaveBeenCalledOnce();
    expect(invalidateDomain).toHaveBeenCalledWith("example.com");
    expect(recordRefresh).toHaveBeenCalledWith(1_000);
  });

  it("enforces a server-side cooldown", async () => {
    const listDomains = vi.fn(async () => ["example.com"]);
    const dependencies = deps({ listDomains, now: () => 1_000, lastRefreshAt: () => 1_000 - REFRESH_COOLDOWN_MS + 1 });

    expect(await refreshDashboard(undefined, "valid", new Headers(), dependencies)).toEqual({
      ok: false,
      message: "Refresh is on cooldown. Try again shortly.",
    });
    expect(listDomains).not.toHaveBeenCalled();
  });

  it("reports failure without clearing cached data", async () => {
    const invalidateDomains = vi.fn();
    const dependencies = deps({
      listDomains: async () => { throw new Error("down"); },
      invalidateDomains,
    });

    expect(await refreshDashboard(undefined, "valid", new Headers(), dependencies)).toEqual({
      ok: false,
      message: "Unable to refresh. Showing cached data.",
    });
    expect(invalidateDomains).not.toHaveBeenCalled();
  });

  it("maps rate limiting to a retry-later message", async () => {
    const dependencies = deps({
      listDomains: async () => { throw new MxrouteError("rate_limited", "limited", 429, 30); },
    });

    expect(await refreshDashboard(undefined, "valid", new Headers(), dependencies)).toEqual({
      ok: false,
      message: "MXroute rate limit exceeded. Try again later.",
    });
  });

  it("falls back to the first domain when none is requested", async () => {
    const invalidateDomain = vi.fn();
    const dependencies = deps({ listDomains: async () => ["first.test", "second.test"], invalidateDomain });

    const result = await refreshDashboard("", "valid", new Headers(), dependencies);

    expect(result).toEqual({ ok: true, message: "Dashboard refreshed" });
    expect(invalidateDomain).toHaveBeenCalledWith("first.test");
  });

  it("handles an empty domain list without invalidating a forwarder tag", async () => {
    const invalidateDomain = vi.fn();
    const dependencies = deps({ listDomains: async () => [], invalidateDomain });

    const result = await refreshDashboard(undefined, "valid", new Headers(), dependencies);

    expect(result).toEqual({ ok: true, message: "Dashboard refreshed" });
    expect(invalidateDomain).not.toHaveBeenCalled();
  });

  it("falls back to the first domain when the requested one is disallowed", async () => {
    const invalidateDomain = vi.fn();
    const dependencies = deps({
      listDomains: async () => ["ok.test", "denied.test"],
      disallowedDomains: ["denied.test"],
      invalidateDomain,
    });

    const result = await refreshDashboard("denied.test", "valid", new Headers(), dependencies);

    expect(result).toEqual({ ok: true, message: "Dashboard refreshed" });
    expect(invalidateDomain).toHaveBeenCalledWith("ok.test");
  });

  it("does not record a refresh timestamp on failure", async () => {
    const recordRefresh = vi.fn();
    const dependencies = deps({
      listDomains: async () => { throw new Error("down"); },
      recordRefresh,
    });

    await refreshDashboard(undefined, "valid", new Headers(), dependencies);
    expect(recordRefresh).not.toHaveBeenCalled();
  });

  it("allows refresh again after the cooldown window passes", async () => {
    const listDomains = vi.fn(async () => ["example.com"]);
    const dependencies = deps({
      listDomains,
      now: () => 100_000,
      lastRefreshAt: () => 100_000 - REFRESH_COOLDOWN_MS,
    });

    expect(await refreshDashboard(undefined, "valid", new Headers(), dependencies)).toMatchObject({ ok: true });
    expect(listDomains).toHaveBeenCalledOnce();
  });
});

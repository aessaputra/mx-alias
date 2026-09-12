import { describe, expect, it } from "vitest";

import {
  filterDisallowed,
  normalizeAlias,
  validateAlias,
  validateDestination,
  validateDomain,
} from "@/lib/validation";

describe("alias validation", () => {
  it("normalizes case and surrounding whitespace", () => {
    expect(normalizeAlias(" Billing-2026 ")).toBe("billing-2026");
  });

  it("accepts a valid alias", () => {
    expect(validateAlias("billing-2026")).toEqual({
      ok: true,
      value: "billing-2026",
    });
  });

  it.each(["billing 2026", "billing@example.test", "", "a".repeat(65)])(
    "rejects invalid alias %j",
    (value) => expect(validateAlias(value).ok).toBe(false),
  );
});

describe("destination validation", () => {
  it("trims and accepts one valid address", () => {
    expect(validateDestination(" user@example.test ")).toEqual({
      ok: true,
      value: "user@example.test",
    });
  });

  it.each([
    "not-an-address",
    ":fail:",
    ":blackhole:",
    "a@b.test\nBcc:x@y.test",
    "\nuser@example.test",
    "user@example.test\r",
    ".user@example.test",
    "user.@example.test",
    "user..name@example.test",
  ])("rejects invalid destination %j", (value) => {
    expect(validateDestination(value).ok).toBe(false);
  });

  it("rejects destinations over 254 characters", () => {
    expect(validateDestination(`${"a".repeat(244)}@example.test`).ok).toBe(false);
  });
});

describe("domain validation", () => {
  it("accepts an allowed domain", () => {
    expect(validateDomain(" Example.Test ", ["example.test"])).toEqual({
      ok: true,
      value: "example.test",
    });
  });

  it("rejects a domain outside the allowed list", () => {
    expect(validateDomain("other.test", ["example.test"]).ok).toBe(false);
  });
});

describe("filterDisallowed", () => {
  it("removes disallowed domains case-insensitively", () => {
    expect(filterDisallowed(["Example.Test", "ok.test"], ["example.test"])).toEqual(["ok.test"]);
  });

  it("returns all domains when the disallowed list is empty", () => {
    expect(filterDisallowed(["a.test", "b.test"], [])).toEqual(["a.test", "b.test"]);
  });
});

import { describe, expect, it } from "vitest";

import { assertSameOrigin, safeEqual } from "@/lib/security";

describe("safeEqual", () => {
  it("accepts equal strings", () => expect(safeEqual("same", "same")).toBe(true));
  it("rejects differing strings", () => expect(safeEqual("same", "diff")).toBe(false));
  it("rejects differing lengths", () => expect(safeEqual("short", "longer")).toBe(false));
});

describe("assertSameOrigin", () => {
  it("accepts an origin matching Host", () => {
    expect(() =>
      assertSameOrigin(new Headers({ host: "admin.example.test", origin: "https://admin.example.test" })),
    ).not.toThrow();
  });

  it("accepts an origin matching the first X-Forwarded-Host", () => {
    expect(() =>
      assertSameOrigin(
        new Headers({
          host: "internal:3000",
          origin: "https://admin.example.test",
          "x-forwarded-host": "admin.example.test, proxy.internal",
        }),
      ),
    ).not.toThrow();
  });

  it("rejects an empty first X-Forwarded-Host value", () => {
    expect(() =>
      assertSameOrigin(
        new Headers({
          host: "admin.example.test",
          origin: "https://admin.example.test",
          "x-forwarded-host": ", proxy.internal",
        }),
      ),
    ).toThrow(/origin/i);
  });

  it("rejects a whitespace-only first X-Forwarded-Host value", () => {
    expect(() =>
      assertSameOrigin(
        new Headers({
          host: "admin.example.test",
          origin: "https://admin.example.test",
          "x-forwarded-host": "   , proxy.internal",
        }),
      ),
    ).toThrow(/origin/i);
  });

  it("rejects a foreign origin", () => {
    expect(() =>
      assertSameOrigin(new Headers({ host: "admin.example.test", origin: "https://evil.example" })),
    ).toThrow(/origin/i);
  });

  it("rejects a missing origin on mutation", () => {
    expect(() => assertSameOrigin(new Headers({ host: "admin.example.test" }))).toThrow(/origin/i);
  });
});

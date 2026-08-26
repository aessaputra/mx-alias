import { describe, expect, it, vi } from "vitest";

import { GET } from "@/app/health/route";

describe("GET /health", () => {
  it("returns 200 with { status: \"ok\" }", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });
  });

  it("works even when MXroute is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("network down"),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });

    vi.restoreAllMocks();
  });
});

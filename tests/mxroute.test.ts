import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MxrouteError,
  createForwarder,
  deleteForwarder,
  listDomains,
  listForwarders,
} from "@/lib/mxroute";

const API_KEY = "secret-api-key";
const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

beforeEach(() => {
  vi.stubEnv("MXROUTE_SERVER", "mail.example.test");
  vi.stubEnv("MXROUTE_USERNAME", "admin");
  vi.stubEnv("MXROUTE_API_KEY", API_KEY);
  vi.stubEnv("ADMIN_PASSWORD", "password");
  vi.stubEnv("SESSION_SECRET", "01234567890123456789012345678901");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("MXroute HTTP contract", () => {
  it("lists domains with authentication, no-store, and a 10-second timeout", async () => {
    const signal = new AbortController().signal;
    const timeoutMock = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ success: true, data: ["example.com"] }));

    await expect(listDomains()).resolves.toEqual(["example.com"]);

    expect(timeoutMock).toHaveBeenCalledWith(10_000);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mxroute.com/domains");
    expect(init).toMatchObject({ method: "GET", cache: "no-store" });
    expect(init?.headers).toMatchObject({
      "X-Server": "mail.example.test",
      "X-Username": "admin",
      "X-API-Key": API_KEY,
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("lists forwarders from an encoded domain path", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            alias: "sales",
            email: "sales@example.com",
            destinations: ["inbox@example.net"],
          },
        ],
      }),
    );

    await expect(listForwarders("example.com/a b")).resolves.toEqual([
      {
        alias: "sales",
        email: "sales@example.com",
        destinations: ["inbox@example.net"],
      },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.mxroute.com/domains/example.com%2Fa%20b/forwarders",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("creates a forwarder with the contract JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 201 }));

    await createForwarder("example.com/a", "sales", "inbox@example.net");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.mxroute.com/domains/example.com%2Fa/forwarders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          alias: "sales",
          destinations: ["inbox@example.net"],
        }),
      }),
    );
  });

  it("accepts a bodyless 204 deletion and encodes both path segments", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteForwarder("example.com/a", "sales team")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.mxroute.com/domains/example.com%2Fa/forwarders/sales%20team",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("MXroute error mapping", () => {
  it.each([
    [401, "unauthorized"],
    [404, "not_found"],
    [409, "conflict"],
    [500, "server"],
  ] as const)("maps HTTP %i to %s", async (status, kind) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: false, error: { message: `raw ${API_KEY}` } }, status),
    );

    const error = await listDomains().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MxrouteError);
    expect(error).toMatchObject({ kind, status });
    expect((error as Error).message).not.toContain(API_KEY);
    expect((error as Error).message).not.toContain("raw");
  });

  it("maps 429 and exposes a valid Retry-After delay", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: false }, 429, { "Retry-After": "30" }),
    );

    await expect(listDomains()).rejects.toMatchObject({
      kind: "rate_limited",
      status: 429,
      retryAfterSeconds: 30,
    });
  });

  it("omits an invalid or absent Retry-After delay", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: false }, 429),
    );

    const error = await listDomains().catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "rate_limited", status: 429 });
    expect(error).not.toHaveProperty("retryAfterSeconds", 0);
  });

  it("maps malformed success JSON without exposing its raw body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(`not-json ${API_KEY}`, { status: 200 }),
    );

    const error = await listDomains().catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "invalid_response", status: 200 });
    expect((error as Error).message).not.toContain(API_KEY);
  });

  it("rejects an invalid success response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: true, data: [42] }),
    );

    await expect(listDomains()).rejects.toMatchObject({
      kind: "invalid_response",
      status: 200,
    });
  });

  it("maps AbortError to a timeout without exposing its message", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new DOMException(`timed out ${API_KEY}`, "AbortError"),
    );

    const error = await listDomains().catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "timeout" });
    expect((error as Error).message).not.toContain(API_KEY);
  });
});

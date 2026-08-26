import { loadConfig } from "@/lib/config";
import type { Forwarder, MxrouteErrorKind } from "@/lib/types";

const BASE_URL = "https://api.mxroute.com";

export class MxrouteError extends Error {
  override name = "MxrouteError";

  constructor(
    public readonly kind: MxrouteErrorKind,
    message: string,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isForwarder = (value: unknown): value is Forwarder =>
  isObject(value) &&
  typeof value.alias === "string" &&
  typeof value.email === "string" &&
  Array.isArray(value.destinations) &&
  value.destinations.every((destination) => typeof destination === "string");

const errorForResponse = (response: Response): MxrouteError => {
  const details: Record<number, [MxrouteErrorKind, string]> = {
    401: ["unauthorized", "MXroute authentication failed"],
    404: ["not_found", "MXroute resource not found"],
    409: ["conflict", "MXroute resource already exists"],
    429: ["rate_limited", "MXroute rate limit exceeded"],
  };
  const [kind, message] = details[response.status] ?? [
    "server",
    "MXroute request failed",
  ];
  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfter = retryAfterHeader === null ? NaN : Number(retryAfterHeader);

  return new MxrouteError(
    kind,
    message,
    response.status,
    response.status === 429 && Number.isFinite(retryAfter) && retryAfter >= 0
      ? retryAfter
      : undefined,
  );
};

async function request<T>(
  path: string,
  init: RequestInit,
  parse?: (value: unknown) => T,
): Promise<T> {
  const config = loadConfig();
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "X-Server": config.mxrouteServer,
        "X-Username": config.mxrouteUsername,
        "X-API-Key": config.mxrouteApiKey,
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new MxrouteError("timeout", "MXroute request timed out");
    }
    throw new MxrouteError("network", "MXroute request failed");
  }

  if (!response.ok) throw errorForResponse(response);
  if (!parse) return undefined as T;

  try {
    return parse(await response.json());
  } catch {
    throw new MxrouteError(
      "invalid_response",
      "MXroute returned an invalid response",
      response.status,
    );
  }
}

const responseData = (value: unknown): unknown => {
  if (!isObject(value) || value.success !== true || !("data" in value)) {
    throw new Error("Invalid MXroute response");
  }
  return value.data;
};

export function listDomains(): Promise<string[]> {
  return request("/domains", { method: "GET" }, (value) => {
    const data = responseData(value);
    if (!Array.isArray(data) || !data.every((domain) => typeof domain === "string")) {
      throw new Error("Invalid domain list");
    }
    return data;
  });
}

export function listForwarders(domain: string): Promise<Forwarder[]> {
  return request(
    `/domains/${encodeURIComponent(domain)}/forwarders`,
    { method: "GET" },
    (value) => {
      const data = responseData(value);
      if (!Array.isArray(data) || !data.every(isForwarder)) {
        throw new Error("Invalid forwarder list");
      }
      return data;
    },
  );
}

export function createForwarder(
  domain: string,
  alias: string,
  destination: string,
): Promise<void> {
  return request(`/domains/${encodeURIComponent(domain)}/forwarders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alias, destinations: [destination] }),
  });
}

export function deleteForwarder(domain: string, alias: string): Promise<void> {
  return request(
    `/domains/${encodeURIComponent(domain)}/forwarders/${encodeURIComponent(alias)}`,
    { method: "DELETE" },
  );
}

export type { Forwarder } from "@/lib/types";

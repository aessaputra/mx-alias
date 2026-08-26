import { createHmac, timingSafeEqual } from "node:crypto";

import { loadConfig } from "@/lib/config";

const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

type SessionPayload = { v: 1; exp: number };

const sign = (payload: string): Buffer =>
  createHmac("sha256", loadConfig().sessionSecret).update(payload).digest();

export function createSessionToken(now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ v: 1, exp: now + SESSION_LIFETIME_MS } satisfies SessionPayload),
  ).toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}

export function verifySessionToken(token: string, now = Date.now()): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [encodedPayload, encodedSignature] = parts;
    const actual = Buffer.from(encodedSignature, "base64url");
    if (actual.toString("base64url") !== encodedSignature) return false;
    const expected = sign(encodedPayload);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    return (
      typeof payload === "object" &&
      payload !== null &&
      "v" in payload &&
      payload.v === 1 &&
      "exp" in payload &&
      typeof payload.exp === "number" &&
      Number.isFinite(payload.exp) &&
      now < payload.exp
    );
  } catch {
    return false;
  }
}

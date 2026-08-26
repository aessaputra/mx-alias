import { timingSafeEqual } from "node:crypto";

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertSameOrigin(headers: Headers): void {
  const origin = headers.get("origin");
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost === null ? headers.get("host") : forwardedHost.split(",", 1)[0].trim();

  let originHost: string | undefined;
  try {
    if (origin) originHost = new URL(origin).host;
  } catch {
    // Rejected below with the same trust-boundary error.
  }

  if (!host || !originHost || !safeEqual(originHost, host)) {
    throw new Error("Request origin does not match host");
  }
}

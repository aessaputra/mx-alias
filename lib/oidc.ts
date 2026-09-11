import { createHash, randomBytes } from "node:crypto";

import type { OidcConfig } from "@/lib/config";

export class OidcError extends Error {
  override name = "OidcError";
}

export type OidcEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
};

const discoveryCache = new Map<string, Promise<OidcEndpoints>>();
// ponytail: unbounded single-issuer cache, add eviction if multi-issuer ever happens.

export function discoverOidc(issuerUrl: string): Promise<OidcEndpoints> {
  const cached = discoveryCache.get(issuerUrl);
  if (cached) return cached;
  const pending = (async () => {
    const res = await fetch(`${issuerUrl}/.well-known/openid-configuration`);
    if (!res.ok) throw new OidcError(`OIDC discovery failed: ${res.status}`);
    const doc: unknown = await res.json();
    if (typeof doc !== "object" || doc === null) throw new OidcError("Invalid OIDC discovery document");
    const record = doc as Record<string, unknown>;
    const { authorization_endpoint, token_endpoint, userinfo_endpoint } = record;
    if (
      typeof authorization_endpoint !== "string" ||
      typeof token_endpoint !== "string" ||
      typeof userinfo_endpoint !== "string"
    ) {
      throw new OidcError("OIDC discovery document is missing endpoints");
    }
    return {
      authorizationEndpoint: authorization_endpoint,
      tokenEndpoint: token_endpoint,
      userinfoEndpoint: userinfo_endpoint,
    };
  })();
  discoveryCache.set(issuerUrl, pending);
  pending.catch(() => discoveryCache.delete(issuerUrl));
  return pending;
}

const base64url = (bytes: Buffer): string =>
  bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function buildAuthorizationUrl(
  endpoints: Pick<OidcEndpoints, "authorizationEndpoint">,
  oidc: OidcConfig,
  opts: { redirectUri: string; state: string; verifier: string },
): string {
  const challenge = base64url(createHash("sha256").update(opts.verifier).digest());
  const url = new URL(endpoints.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", oidc.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  opts: { code: string; redirectUri: string; verifier: string; clientId: string; clientSecret: string },
): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.verifier,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
  });
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new OidcError(`OIDC token exchange failed: ${res.status}`);
  const data: unknown = await res.json();
  const accessToken =
    typeof data === "object" && data !== null && "access_token" in data
      ? (data as Record<string, unknown>).access_token
      : undefined;
  if (typeof accessToken !== "string" || !accessToken) throw new OidcError("OIDC token response has no access token");
  return { accessToken };
}

export async function fetchUserEmail(
  userinfoEndpoint: string,
  accessToken: string,
): Promise<{ email: string; verified: boolean }> {
  const res = await fetch(userinfoEndpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new OidcError(`OIDC userinfo failed: ${res.status}`);
  const data: unknown = await res.json();
  if (typeof data !== "object" || data === null) throw new OidcError("Invalid OIDC userinfo response");
  const record = data as Record<string, unknown>;
  if (typeof record.email !== "string" || !record.email) throw new OidcError("OIDC userinfo has no email");
  return { email: record.email, verified: record.email_verified !== false };
}

export function isEmailAllowed(actual: string, allowed: string): boolean {
  return actual.toLowerCase() === allowed.toLowerCase();
}

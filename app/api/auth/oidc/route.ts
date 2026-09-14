import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { loadConfig } from "@/lib/config";
import { buildAuthorizationUrl, createPkcePair, discoverOidc } from "@/lib/oidc";

const base64url = (bytes: Buffer): string =>
  bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function GET(request: Request): Promise<Response> {
  const oidc = loadConfig().oidc;
  if (!oidc) return NextResponse.redirect(new URL("/login", request.url));
  const endpoints = await discoverOidc(oidc.issuerUrl);
  const { verifier } = createPkcePair();
  const state = base64url(randomBytes(16));
  const redirectUri = new URL("/api/auth/callback", request.url).toString();
  const authorizationUrl = buildAuthorizationUrl(endpoints, oidc, { redirectUri, state, verifier });
  const response = NextResponse.redirect(authorizationUrl);
  const secure = process.env.NODE_ENV === "production";
  for (const [name, value] of [["oidc_state", state], ["oidc_verifier", verifier]] as const) {
    response.cookies.set(name, value, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
  }
  return response;
}

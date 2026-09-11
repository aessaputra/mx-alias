import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { loadConfig } from "@/lib/config";
import {
  discoverOidc,
  exchangeCodeForTokens,
  fetchUserEmail,
  isEmailAllowed,
  OidcError,
} from "@/lib/oidc";
import { safeEqual } from "@/lib/security";
import { createSessionToken } from "@/lib/session";

const SESSION_COOKIE = "mx_alias_session";

const fail = (request: Request): Response => {
  const response = NextResponse.redirect(new URL("/login?error=oidc", request.url));
  response.cookies.delete("oidc_state");
  response.cookies.delete("oidc_verifier");
  return response;
};

export async function GET(request: Request): Promise<Response> {
  try {
    const oidc = loadConfig().oidc;
    if (!oidc) return NextResponse.redirect(new URL("/login", request.url));
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const store = await cookies();
    const stateCookie = store.get("oidc_state")?.value;
    const verifier = store.get("oidc_verifier")?.value;
    if (!code || !state || !stateCookie || !verifier || !safeEqual(state, stateCookie)) return fail(request);
    const endpoints = await discoverOidc(oidc.issuerUrl);
    const redirectUri = new URL("/api/auth/callback", request.url).toString();
    const { accessToken } = await exchangeCodeForTokens(endpoints.tokenEndpoint, {
      code,
      redirectUri,
      verifier,
      clientId: oidc.clientId,
      clientSecret: oidc.clientSecret,
    });
    const user = await fetchUserEmail(endpoints.userinfoEndpoint, accessToken);
    if (!user.verified || !isEmailAllowed(user.email, oidc.allowedEmail)) return fail(request);
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("oidc_state");
    response.cookies.delete("oidc_verifier");
    response.cookies.set(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 43_200,
    });
    return response;
  } catch (error) {
    if (error instanceof OidcError) return fail(request);
    throw error;
  }
}

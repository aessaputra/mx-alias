import { describe, expect, it } from "vitest";

import { createPkcePair } from "@/lib/oidc";
import { buildAuthorizationUrl, exchangeCodeForTokens, fetchUserEmail } from "@/lib/oidc";

it("exchanges code and reads email from userinfo", async () => {
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/token")) {
      return new Response(JSON.stringify({ access_token: "at-123", token_type: "Bearer" }), { status: 200 });
    }
    return new Response(JSON.stringify({ email: "admin@example.test", email_verified: true }), { status: 200 });
  }) as typeof fetch;
  try {
    const { accessToken } = await exchangeCodeForTokens("https://id.example.test/token", {
      code: "code-1",
      redirectUri: "https://app.example.test/api/auth/callback",
      verifier: "verifier-1",
      clientId: "mx-alias",
      clientSecret: "secret-value",
    });
    expect(accessToken).toBe("at-123");
    const user = await fetchUserEmail("https://id.example.test/userinfo", accessToken);
    expect(user).toEqual({ email: "admin@example.test", verified: true });
    expect(calls).toEqual(["https://id.example.test/token", "https://id.example.test/userinfo"]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

it("builds the authorization URL with PKCE S256", () => {
  const url = new URL(
    buildAuthorizationUrl(
      { authorizationEndpoint: "https://id.example.test/authorize" },
      {
        issuerUrl: "https://id.example.test",
        clientId: "mx-alias",
        clientSecret: "secret-value",
        allowedEmail: "admin@example.test",
      },
      { redirectUri: "https://app.example.test/api/auth/callback", state: "s", verifier: "v" },
    ),
  );
  expect(url.searchParams.get("response_type")).toBe("code");
  expect(url.searchParams.get("client_id")).toBe("mx-alias");
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.get("scope")).toBe("openid profile email");
});

describe("createPkcePair", () => {
  it("returns url-safe verifier and challenge", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });
});

"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/action-handlers";
import { loginAction } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };

export default function LoginForm({
  oidcEnabled,
  error,
}: {
  oidcEnabled: boolean;
  error: string | undefined;
}) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <main className="login-page">
      <header className="login-identity">
        <p className="kicker">MX routing control</p>
        <h1>MX<br />Alias</h1>
      </header>
      <section className="login-access" aria-labelledby="access-title">
        <div className="section-heading">
          <p className="kicker">01 / Authorized access</p>
          <h2 id="access-title">Sign in</h2>
        </div>
        <form action={action} className="login-form">
          <div className="field">
            <label htmlFor="password">Admin password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? "Signing in..." : "Sign in"}
          </button>
          {!state.ok && state.message ? <p className="field-error" role="alert">{state.message}</p> : null}
          {error === "oidc" ? (
            <p className="field-error" role="alert">Pocket ID sign-in failed. Try again or use your password.</p>
          ) : null}
          {oidcEnabled ? (
            <>
              <p className="login-divider">or</p>
              <a className="secondary-button" href="/api/auth/pocketid">Sign in with Pocket ID</a>
            </>
          ) : null}
        </form>
      </section>
    </main>
  );
}

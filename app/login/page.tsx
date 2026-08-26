"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/action-handlers";
import { loginAction } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <main className="login-page">
      <h1>Email Alias Manager</h1>
      <form action={action} className="login-form">
        <div className="field">
          <label htmlFor="password">Admin password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "Signing in..." : "Sign in"}
        </button>
        {!state.ok && state.message ? <p className="field-error" role="alert">{state.message}</p> : null}
      </form>
    </main>
  );
}

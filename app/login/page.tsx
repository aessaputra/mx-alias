"use client";

import { useActionState } from "react";

import { loginAction, type ActionState } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <main>
      <h1>Email Alias Manager</h1>
      <form action={action}>
        <label htmlFor="password">Admin password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
        <button disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button>
        {!state.ok && state.message ? <p role="alert">{state.message}</p> : null}
      </form>
    </main>
  );
}

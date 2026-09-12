"use client";

import { useActionState } from "react";

import { refreshDashboardAction } from "@/app/actions";
import type { ActionState } from "@/app/action-handlers";

const initialState: ActionState = { ok: false, message: "" };

export function RefreshButton({ domain }: Readonly<{ domain?: string }>) {
  const [state, action, pending] = useActionState(refreshDashboardAction, initialState);

  return (
    <div className="refresh-wrap">
      <form action={action} className="refresh-form">
        <input type="hidden" name="domain" value={domain ?? ""} />
        <button className="text-button" type="submit" disabled={pending}>
          {pending ? "Refreshing..." : "Refresh"}
        </button>
      </form>
      {state.message && !state.ok ? (
        <p className="refresh-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

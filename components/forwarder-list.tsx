"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { ActionState } from "@/app/action-handlers";
import { deleteAliasAction } from "@/app/actions";
import type { Forwarder } from "@/lib/types";

const initialState: ActionState = { ok: false, message: "" };

export function ForwarderList({ forwarders, domain }: Readonly<{ forwarders: Forwarder[]; domain: string }>) {
  const [copied, setCopied] = useState("");
  const [selected, setSelected] = useState<Forwarder>();
  const [state, action, pending] = useActionState(deleteAliasAction, initialState);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) dialog.current?.close();
  }, [state]);

  async function copy(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      window.setTimeout(() => setCopied((current) => current === address ? "" : current), 1800);
    } catch {
      setCopied("");
    }
  }

  function confirmDelete(forwarder: Forwarder) {
    setSelected(forwarder);
    dialog.current?.showModal();
  }

  return (
    <section className="list-panel" aria-labelledby="list-title">
      <div className="list-heading">
        <div>
          <p className="kicker">Current routing</p>
          <h2 id="list-title">Forwarders</h2>
        </div>
        <p><strong>{forwarders.length}</strong> {forwarders.length === 1 ? "alias" : "aliases"}</p>
      </div>

      {forwarders.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Alias</th><th scope="col">Destination</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {forwarders.map((forwarder) => {
                const address = forwarder.email || `${forwarder.alias}@${domain}`;
                const destination = forwarder.destinations[0] ?? "Not configured";
                return (
                  <tr key={address}>
                    <td data-label="Alias"><code>{address}</code></td>
                    <td data-label="Destination"><code>{destination}</code></td>
                    <td data-label="Actions" className="row-actions">
                      <button className="text-button" type="button" onClick={() => copy(address)} aria-label={`Copy ${address}`}>
                        {copied === address ? "Copied" : "Copy"}
                      </button>
                      <button className="delete-button" type="button" onClick={() => confirmDelete(forwarder)} aria-label={`Delete ${address}`}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="sr-only" role="status" aria-live="polite">{copied ? `${copied} copied` : ""}</p>
        </div>
      ) : (
        <div className="empty-state">
          <p>No aliases for this domain.</p>
          <a href="#create">Create the first alias</a>
        </div>
      )}

      <dialog ref={dialog} aria-labelledby="delete-title" onClose={() => setSelected(undefined)}>
        <form action={action}>
          <h3 id="delete-title">Delete this alias?</h3>
          <p>Mail sent to <code>{selected?.email || (selected ? `${selected.alias}@${domain}` : "")}</code> will stop forwarding.</p>
          <input type="hidden" name="domain" value={domain} />
          <input type="hidden" name="alias" value={selected?.alias ?? ""} />
          {state.message && !state.ok ? <p className="field-error" role="alert">{state.message}</p> : null}
          <div className="dialog-actions">
            <button className="secondary-button" type="button" onClick={() => dialog.current?.close()}>Cancel</button>
            <button className="delete-confirm" type="submit" disabled={pending}>{pending ? "Deleting..." : "Delete alias"}</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}

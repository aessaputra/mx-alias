"use client";

import { useActionState, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { ActionState } from "@/app/action-handlers";
import { createAliasAction, generateAliasAction } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };

type AliasFormProps = Readonly<{
  domains: string[];
  selectedDomain?: string;
}>;

export function AliasForm({ domains, selectedDomain }: AliasFormProps) {
  const [state, action, pending] = useActionState(createAliasAction, initialState);
  const [domain, setDomain] = useState(selectedDomain ?? domains[0] ?? "");
  const [alias, setAlias] = useState("");
  const [generateError, setGenerateError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const address = alias && domain ? `${alias}@${domain}` : `alias@${domain || "domain"}`;

  function handleDomainChange(value: string) {
    setDomain(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("domain", value);
    router.push(`/?${params.toString()}`);
  }

  async function generate() {
    setGenerateError("");
    const result = await generateAliasAction();
    if (result.ok && result.alias) setAlias(result.alias);
    else setGenerateError(result.message);
  }

  return (
    <section className="create-panel" id="create" aria-labelledby="create-title">
      <div className="section-heading">
        <p className="kicker">New forwarder</p>
        <h2 id="create-title">Create an alias</h2>
        <p>Route a new address to one destination.</p>
      </div>

      {domains.length ? (
        <form action={action} className="alias-form">
          <div className="field">
            <label htmlFor="domain">Domain</label>
            <select id="domain" name="domain" value={domain} onChange={(event) => handleDomainChange(event.target.value)}>
              {domains.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="alias">Alias</label>
            <div className="alias-control">
              <input
                id="alias"
                name="alias"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                aria-describedby={`address-preview${!state.ok && state.message ? " create-message" : ""}`}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <button className="secondary-button" type="button" onClick={generate}>Generate</button>
            </div>
            <p className="address-preview" id="address-preview">Complete address: <code>{address}</code></p>
            {generateError ? <p className="field-error" role="alert">{generateError}</p> : null}
          </div>

          <div className="field">
            <label htmlFor="destination">Destination</label>
            <input
              id="destination"
              name="destination"
              type="email"
              aria-describedby={!state.ok && state.message ? "create-message" : undefined}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Creating alias..." : "Create alias"}
          </button>
          {state.message ? (
            <p id="create-message" className={state.ok ? "action-success" : "field-error"} role={state.ok ? "status" : "alert"}>
              {state.message}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="empty-inline">No domains are available. Refresh after checking the MXroute configuration.</p>
      )}
    </section>
  );
}

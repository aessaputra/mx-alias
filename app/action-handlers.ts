import { createHash, timingSafeEqual } from "node:crypto";

import { generateAlias as createGeneratedAlias } from "@/lib/generator";
import { validateAlias, validateDestination, validateDomain } from "@/lib/validation";

export type ActionState = { ok: boolean; message: string };
type LoginResult = ActionState | { ok: true; token: string };

type ParsedAliasForm =
  | { kind: "error"; ok: false; message: string }
  | { kind: "ok"; ok: true; domain: string; alias: string };

export type AuthDeps = Readonly<{
  adminPassword: string;
  comparePassword: (submitted: unknown, expected: string) => boolean;
  createSessionToken: () => string;
  verifySessionToken: (token: string) => boolean;
  assertSameOrigin: (headers: Headers) => void;
}>;

export type ForwarderDeps = Readonly<{
  listDomains: () => Promise<string[]>;
  createForwarder: (domain: string, alias: string, destination: string) => Promise<void>;
  deleteForwarder: (domain: string, alias: string) => Promise<void>;
}>;

export type ActionDependencies = AuthDeps & ForwarderDeps;

export function comparePassword(submitted: unknown, expected: string): boolean {
  const submittedDigest = createHash("sha256").update(typeof submitted === "string" ? submitted : "").digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(submittedDigest, expectedDigest) && typeof submitted === "string";
}

export async function login(formData: FormData, deps: ActionDependencies): Promise<LoginResult> {
  if (!deps.comparePassword(formData.get("password"), deps.adminPassword)) {
    return { ok: false, message: "Invalid credentials" };
  }
  return { ok: true, token: deps.createSessionToken() };
}

const authenticate = (token: string | undefined, deps: ActionDependencies): ActionState | undefined => {
  if (!token || !deps.verifySessionToken(token)) return { ok: false, message: "Authentication required" };
};

const authorize = (token: string | undefined, requestHeaders: Headers, deps: ActionDependencies): ActionState | undefined => {
  const denied = authenticate(token, deps);
  if (denied) return denied;
  try {
    deps.assertSameOrigin(requestHeaders);
  } catch {
    return { ok: false, message: "Request rejected" };
  }
};

export function generateAlias(token: string | undefined, deps: ActionDependencies): ActionState & { alias?: string } {
  const denied = authenticate(token, deps);
  return denied ?? { ok: true, message: "Alias generated", alias: createGeneratedAlias() };
}

async function parseAliasForm(formData: FormData, deps: ForwarderDeps): Promise<ParsedAliasForm> {
  const domain = validateDomain(String(formData.get("domain") ?? ""), await deps.listDomains());
  if (!domain.ok) return { kind: "error" as const, ok: false, message: domain.message };
  const alias = validateAlias(String(formData.get("alias") ?? ""));
  if (!alias.ok) return { kind: "error" as const, ok: false, message: alias.message };
  return { kind: "ok", ok: true, domain: domain.value, alias: alias.value };
}

export async function createAlias(formData: FormData, token: string | undefined, requestHeaders: Headers, deps: ActionDependencies): Promise<ActionState> {
  const denied = authorize(token, requestHeaders, deps);
  if (denied) return denied;

  try {
    const parsed = await parseAliasForm(formData, deps);
    if (!parsed.ok) return { ok: parsed.ok, message: parsed.message };
    const destination = validateDestination(String(formData.get("destination") ?? ""));
    if (!destination.ok) return destination;
    await deps.createForwarder(parsed.domain, parsed.alias, destination.value);
    return { ok: true, message: "Alias created" };
  } catch {
    return { ok: false, message: "Unable to create alias" };
  }
}

export async function deleteAlias(formData: FormData, token: string | undefined, requestHeaders: Headers, deps: ActionDependencies): Promise<ActionState> {
  const denied = authorize(token, requestHeaders, deps);
  if (denied) return denied;

  try {
    const parsed = await parseAliasForm(formData, deps);
    if (!parsed.ok) return { ok: parsed.ok, message: parsed.message };
    await deps.deleteForwarder(parsed.domain, parsed.alias);
    return { ok: true, message: "Alias deleted" };
  } catch {
    return { ok: false, message: "Unable to delete alias" };
  }
}

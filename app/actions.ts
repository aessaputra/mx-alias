"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { loadConfig } from "@/lib/config";
import { generateAlias } from "@/lib/generator";
import { createForwarder, deleteForwarder, listDomains } from "@/lib/mxroute";
import { assertSameOrigin, safeEqual } from "@/lib/security";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { validateAlias, validateDestination, validateDomain } from "@/lib/validation";

const SESSION_COOKIE = "email_alias_session";

export type ActionState = { ok: boolean; message: string };
type LoginResult = ActionState | { ok: true; token: string };

export type ActionDependencies = Readonly<{
  adminPassword: string;
  createSessionToken: () => string;
  verifySessionToken: (token: string) => boolean;
  assertSameOrigin: (headers: Headers) => void;
  listDomains: () => Promise<string[]>;
  createForwarder: (domain: string, alias: string, destination: string) => Promise<void>;
  deleteForwarder: (domain: string, alias: string) => Promise<void>;
}>;

const dependencies = (): ActionDependencies => ({
  adminPassword: loadConfig().adminPassword,
  createSessionToken,
  verifySessionToken,
  assertSameOrigin,
  listDomains,
  createForwarder,
  deleteForwarder,
});

export async function login(formData: FormData, deps: ActionDependencies): Promise<LoginResult> {
  const password = formData.get("password");
  if (typeof password !== "string" || !safeEqual(password, deps.adminPassword)) {
    return { ok: false, message: "Invalid credentials" };
  }
  return { ok: true, token: deps.createSessionToken() };
}

const authorize = (token: string | undefined, requestHeaders: Headers, deps: ActionDependencies): ActionState | undefined => {
  if (!token || !deps.verifySessionToken(token)) return { ok: false, message: "Authentication required" };
  try {
    deps.assertSameOrigin(requestHeaders);
  } catch {
    return { ok: false, message: "Request rejected" };
  }
};

export async function createAlias(formData: FormData, token: string | undefined, requestHeaders: Headers, deps: ActionDependencies): Promise<ActionState> {
  const denied = authorize(token, requestHeaders, deps);
  if (denied) return denied;

  try {
    const domain = validateDomain(String(formData.get("domain") ?? ""), await deps.listDomains());
    if (!domain.ok) return domain;
    const alias = validateAlias(String(formData.get("alias") ?? ""));
    if (!alias.ok) return alias;
    const destination = validateDestination(String(formData.get("destination") ?? ""));
    if (!destination.ok) return destination;
    await deps.createForwarder(domain.value, alias.value, destination.value);
    return { ok: true, message: "Alias created" };
  } catch {
    return { ok: false, message: "Unable to create alias" };
  }
}

export async function deleteAlias(formData: FormData, token: string | undefined, requestHeaders: Headers, deps: ActionDependencies): Promise<ActionState> {
  const denied = authorize(token, requestHeaders, deps);
  if (denied) return denied;

  try {
    const domain = validateDomain(String(formData.get("domain") ?? ""), await deps.listDomains());
    if (!domain.ok) return domain;
    const alias = validateAlias(String(formData.get("alias") ?? ""));
    if (!alias.ok) return alias;
    await deps.deleteForwarder(domain.value, alias.value);
    return { ok: true, message: "Alias deleted" };
  } catch {
    return { ok: false, message: "Unable to delete alias" };
  }
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await login(formData, dependencies());
  if (!result.ok || !("token" in result)) return result;
  (await cookies()).set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 43_200,
  });
  redirect("/");
}

export async function logoutAction(): Promise<never> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function generateAliasAction(): Promise<ActionState & { alias?: string }> {
  return { ok: true, message: "Alias generated", alias: generateAlias() };
}

export async function createAliasAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const store = await cookies();
  const result = await createAlias(formData, store.get(SESSION_COOKIE)?.value, await headers(), dependencies());
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteAliasAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const store = await cookies();
  const result = await deleteAlias(formData, store.get(SESSION_COOKIE)?.value, await headers(), dependencies());
  if (result.ok) revalidatePath("/");
  return result;
}

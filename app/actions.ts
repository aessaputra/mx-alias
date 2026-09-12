"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  comparePassword,
  createAlias,
  deleteAlias,
  generateAlias,
  login,
  refreshDashboard,
  type ActionDependencies,
  type ActionState,
} from "@/app/action-handlers";
import { loadConfig } from "@/lib/config";
import {
  createForwarder,
  deleteForwarder,
  forwarderTag,
  listDomains,
  MX_DOMAINS_TAG,
} from "@/lib/mxroute";
import { assertSameOrigin } from "@/lib/security";
import { createSessionToken, verifySessionToken } from "@/lib/session";

const SESSION_COOKIE = "mx_alias_session";

const dependencies = (): ActionDependencies => {
  const config = loadConfig();
  return {
    adminPassword: config.adminPassword,
  comparePassword,
  createSessionToken,
  verifySessionToken,
  assertSameOrigin,
    listDomains,
    disallowedDomains: config.disallowedDomains,
    createForwarder,
    deleteForwarder,
  };
};

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
  const store = await cookies();
  return generateAlias(store.get(SESSION_COOKIE)?.value, dependencies());
}

async function runMutation(
  mutate: (
    formData: FormData,
    token: string | undefined,
    requestHeaders: Headers,
    deps: ActionDependencies,
  ) => Promise<ActionState>,
  formData: FormData,
): Promise<ActionState> {
  const store = await cookies();
  const result = await mutate(formData, store.get(SESSION_COOKIE)?.value, await headers(), dependencies());
  if (result.ok) {
    const parsed = String(formData.get("domain") ?? "").trim().toLowerCase();
    if (parsed) updateTag(forwarderTag(parsed));
  }
  return result;
}

export async function createAliasAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runMutation(createAlias, formData);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteAliasAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runMutation(deleteAlias, formData);
  if (result.ok) revalidatePath("/");
  return result;
}

// ponytail: process-local cooldown per session for a single instance. Move to shared store if deployed with multiple instances.
const lastRefreshAt = new Map<string, number>();
const MAX_REFRESH_ENTRIES = 1_000;

const recordRefreshAt = (token: string, at: number): void => {
  if (lastRefreshAt.size >= MAX_REFRESH_ENTRIES && !lastRefreshAt.has(token)) {
    const oldest = lastRefreshAt.keys().next();
    if (!oldest.done) lastRefreshAt.delete(oldest.value);
  }
  lastRefreshAt.set(token, at);
};

export async function refreshDashboardAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const result = await refreshDashboard(
    String(formData.get("domain") ?? "") || undefined,
    token,
    await headers(),
    {
      ...dependencies(),
      invalidateDomain: (domain) => updateTag(forwarderTag(domain)),
      invalidateDomains: () => updateTag(MX_DOMAINS_TAG),
      lastRefreshAt: () => (token === undefined ? undefined : lastRefreshAt.get(token)),
      recordRefresh: (at) => {
        if (token !== undefined) recordRefreshAt(token, at);
      },
    },
  );
  if (result.ok) revalidatePath("/");
  return result;
}

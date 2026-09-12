"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  comparePassword,
  createAlias,
  deleteAlias,
  generateAlias,
  login,
  type ActionDependencies,
  type ActionState,
} from "@/app/action-handlers";
import { loadConfig } from "@/lib/config";
import { createForwarder, deleteForwarder, listDomains } from "@/lib/mxroute";
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

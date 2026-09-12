import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";

import {
  createAliasAction,
  deleteAliasAction,
  refreshDashboardAction,
} from "@/app/actions";
import {
  createForwarder,
  deleteForwarder,
  forwarderTag,
  listDomains,
} from "@/lib/mxroute";
import { createSessionToken } from "@/lib/session";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/mxroute", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mxroute")>();
  return {
    ...original,
    createForwarder: vi.fn(),
    deleteForwarder: vi.fn(),
    listDomains: vi.fn(),
  };
});

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const initialState = { ok: false, message: "" };

beforeEach(() => {
  vi.stubEnv("MXROUTE_SERVER", "mail.example.test");
  vi.stubEnv("MXROUTE_USERNAME", "admin");
  vi.stubEnv("MXROUTE_API_KEY", "secret");
  vi.stubEnv("ADMIN_PASSWORD", "password");
  vi.stubEnv("SESSION_SECRET", "01234567890123456789012345678901");

  vi.mocked(listDomains).mockResolvedValue(["example.com"]);
  vi.mocked(createForwarder).mockResolvedValue(undefined);
  vi.mocked(deleteForwarder).mockResolvedValue(undefined);

  const token = createSessionToken();
  vi.mocked(cookies).mockResolvedValue({
    get: () => ({ value: token }),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(headers).mockResolvedValue(
    new Headers({
      origin: "http://localhost:3100",
      host: "localhost:3100",
    }) as unknown as Awaited<ReturnType<typeof headers>>,
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("mutation tag invalidation", () => {
  it("create invalidates only the touched domain tag", async () => {
    const result = await createAliasAction(
      initialState,
      form({ domain: "EXAMPLE.com", alias: "sales", destination: "inbox@example.net" }),
    );

    expect(result).toEqual({ ok: true, message: "Alias created" });
    expect(updateTag).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith(forwarderTag("example.com"));
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("failed create invalidates nothing", async () => {
    const result = await createAliasAction(
      initialState,
      form({ domain: "example.com", alias: "BAD!", destination: "inbox@example.net" }),
    );

    expect(result.ok).toBe(false);
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("delete invalidates only the touched domain tag", async () => {
    const result = await deleteAliasAction(
      initialState,
      form({ domain: "example.com", alias: "sales" }),
    );

    expect(result).toEqual({ ok: true, message: "Alias deleted" });
    expect(updateTag).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith(forwarderTag("example.com"));
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("refresh action wiring", () => {
  it("invalidates domains plus the active domain and then hits cooldown", async () => {
    const first = await refreshDashboardAction(
      { ok: false, message: "" },
      form({ domain: "example.com" }),
    );

    expect(first).toEqual({ ok: true, message: "Dashboard refreshed" });
    expect(listDomains).toHaveBeenCalledOnce();
    expect(updateTag).toHaveBeenCalledWith("mx-domains");
    expect(updateTag).toHaveBeenCalledWith(forwarderTag("example.com"));
    expect(revalidatePath).toHaveBeenCalledWith("/");

    const second = await refreshDashboardAction(
      { ok: false, message: "" },
      form({ domain: "example.com" }),
    );

    expect(second).toEqual({ ok: false, message: "Refresh is on cooldown. Try again shortly." });
  });
});

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { listDomains, listForwarders } from "@/lib/mxroute";
import { verifySessionToken } from "@/lib/session";
import { validateDomain } from "@/lib/validation";

type PageProps = { searchParams: Promise<{ domain?: string }> };

export default async function Home({ searchParams }: PageProps) {
  const token = (await cookies()).get("email_alias_session")?.value;
  if (!token || !verifySessionToken(token)) redirect("/login");

  const domains = await listDomains();
  const requested = (await searchParams).domain;
  const selected = requested ? validateDomain(requested, domains) : undefined;
  const selectedDomain = selected?.ok ? selected.value : domains[0];
  const forwarders = selectedDomain ? await listForwarders(selectedDomain) : [];

  return (
    <main>
      <h1>Email Alias Manager</h1>
      <p>{domains.length} domains, {forwarders.length} aliases{selectedDomain ? ` for ${selectedDomain}` : ""}</p>
    </main>
  );
}

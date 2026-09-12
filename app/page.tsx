import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions";
import Link from "next/link";
import { AliasForm } from "@/components/alias-form";
import { ForwarderList } from "@/components/forwarder-list";
import { RefreshButton } from "@/components/refresh-button";
import { loadConfig } from "@/lib/config";
import { listDomains, listForwarders } from "@/lib/mxroute";
import { verifySessionToken } from "@/lib/session";
import { filterDisallowed, resolveActiveDomain } from "@/lib/validation";

type PageProps = { searchParams: Promise<{ domain?: string }> };

export default async function Home({ searchParams }: PageProps) {
  const token = (await cookies()).get("mx_alias_session")?.value;
  if (!token || !verifySessionToken(token)) redirect("/login");

  const domains = filterDisallowed(await listDomains(), loadConfig().disallowedDomains);
  const selectedDomain = resolveActiveDomain((await searchParams).domain, domains);
  const forwarders = selectedDomain ? await listForwarders(selectedDomain) : [];

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">MX Alias</Link>
        <nav aria-label="Dashboard controls">
          <RefreshButton domain={selectedDomain} />
          <form action={logoutAction}><button className="text-button" type="submit">Log out</button></form>
        </nav>
      </header>
      <main className="dashboard">
        <AliasForm domains={domains} selectedDomain={selectedDomain} />
        {selectedDomain ? <ForwarderList forwarders={forwarders} domain={selectedDomain} /> : (
          <section className="list-panel" aria-labelledby="list-title">
            <div className="section-heading"><p className="kicker">02 / Current routing</p><h2 id="list-title">Forwarders</h2></div>
            <div className="empty-state"><p>No MXroute domains are available.</p><p>Check the server configuration, then refresh.</p></div>
          </section>
        )}
      </main>
    </>
  );
}

import { Briefcase, Globe, Phone, Search } from "lucide-react";
import Link from "next/link";
import { BranchBadge } from "@/components/BranchBadge";
import { requireApproved } from "@/lib/auth";
import { safeHref } from "@/lib/content";

export const metadata = { title: "Support Members" };

type Business = {
  owner_id: string;
  owner_name: string;
  group_id: string;
  business_name: string;
  business_website: string | null;
  business_phone: string | null;
  business_description: string | null;
};

export default async function SupportPage(props: PageProps<"/support">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const { supabase } = await requireApproved();
  const { data } = await supabase.rpc("member_businesses");
  const all = (data ?? []) as Business[];
  const shown = q
    ? all.filter((b) =>
        [b.business_name, b.business_description, b.owner_name].some((t) => t?.toLowerCase().includes(q)),
      )
    : all;

  return (
    <div>
      <div className="hero-bg relative mb-8 overflow-hidden rounded-2xl text-white shadow-lg">
        <div className="stars absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative p-6 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-gold">Member-owned businesses</p>
          <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Support Members</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-200">
            When you need a service, call one of our own first. These businesses are owned by BOBSF members.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <form className="flex w-full max-w-md gap-2" role="search">
          <label htmlFor="q" className="sr-only">Search businesses</label>
          <input className="input" id="q" name="q" defaultValue={sp.q as string | undefined} placeholder="Search, for example roofing or insurance" />
          <button className="btn btn-small" aria-label="Search"><Search className="h-5 w-5" /></button>
        </form>
        <Link href="/profile#work-h" className="btn-secondary btn-small">
          <Briefcase className="mr-1 h-4 w-4" /> List my business
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className="card">
          {q ? "No businesses match that search." : "No member businesses yet. Own a business? Add it on your profile and it will show up here."}
        </p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {shown.map((b) => {
            const site = safeHref(b.business_website);
            return (
              <li key={b.owner_id} className="lift-card flex flex-col p-6">
                <h2 className="text-2xl font-bold text-navy">{b.business_name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                  Owned by <span className="font-semibold text-foreground">{b.owner_name}</span>
                  <BranchBadge groupId={b.group_id} size="sm" />
                </p>
                {b.business_description && <p className="mt-3 whitespace-pre-line">{b.business_description}</p>}
                <p className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-4">
                  {site && (
                    <a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                      <Globe className="h-4 w-4" /> {site.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                  {b.business_phone && (
                    <a href={`tel:${b.business_phone}`} className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4" /> {b.business_phone}
                    </a>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

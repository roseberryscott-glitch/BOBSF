import { ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { MENU_PAGES, PAGE_ROUTES } from "@/lib/content";
import { getMenuPages } from "@/lib/site";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-white no-underline">
      <Image src="/bobsf-logo-small.png" alt="BOBSF logo" width={240} height={218} priority className="h-11 w-auto" />
      <span className="font-display text-2xl font-bold tracking-wider">BOBSF</span>
    </Link>
  );
}

// Red circle with a white number, e.g. registrations waiting for an admin.
function Badge({ count, label }: { count: number; label: string }) {
  if (!count) return null;
  return (
    <span
      aria-label={label}
      className="ml-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-sm font-bold leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export async function SiteHeader() {
  const { supabase, profile } = await getViewer();
  const approved = profile?.status === "approved";
  const isAdmin = approved && profile.role === "admin";
  const [pages, pending] = await Promise.all([
    getMenuPages(supabase),
    isAdmin
      ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);
  const pendingCount = pending.count ?? 0;
  const pendingLabel = `${pendingCount} ${pendingCount === 1 ? "registration" : "registrations"} waiting`;

  // "About" pages that are switched on (admins hide them from the editor).
  const aboutLinks = MENU_PAGES.flatMap((slug) => {
    const p = pages.find((x) => x.slug === slug);
    return p && p.visible ? [{ href: PAGE_ROUTES[slug], label: p.title }] : [];
  });
  const memberLinks: { href: string; label: string; badge?: number }[] = approved
    ? [
        { href: "/events", label: "Calendar" },
        { href: "/forums", label: "Forums" },
        { href: "/members", label: "Members" },
        { href: "/support", label: "Support Members" },
        ...(profile.role !== "member" ? [{ href: "/email", label: "Email" }] : []),
        ...(isAdmin ? [{ href: pendingCount ? "/admin?tab=pending" : "/admin", label: "Admin", badge: pendingCount }] : []),
      ]
    : [];
  const accountLinks = profile
    ? approved
      ? [{ href: "/profile", label: "My profile" }]
      : []
    : [
        { href: "/login", label: "Sign in" },
        { href: "/signup", label: "Join" },
      ];

  const link = "whitespace-nowrap rounded-lg px-3 py-2 font-semibold text-white no-underline hover:bg-white/10";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 text-white shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        <Logo />

        {/* Wide screens */}
        <nav aria-label="Main" className="ml-6 hidden flex-1 items-center gap-1 min-[1140px]:flex">
          {aboutLinks.length > 0 && (
            // Opens while the mouse is over "About" (or when tabbing to it)
            // and closes as soon as the mouse moves away.
            <div className="group relative">
              <button type="button" aria-haspopup="true" className={`${link} flex cursor-pointer items-center gap-1`}>
                About <ChevronDown className="h-4 w-4 transition group-hover:rotate-180 group-has-[:focus-visible]:rotate-180" />
              </button>
              <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100">
                <div className="w-56 overflow-hidden rounded-xl bg-white py-2 text-navy shadow-2xl">
                  {aboutLinks.map((l) => (
                    <Link key={l.href} href={l.href} className="block px-4 py-2 font-semibold text-navy no-underline hover:bg-slate-100">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
          {memberLinks.map((l) => (
            <Link key={l.href} href={l.href} className={`${link} inline-flex items-center`}>
              {l.label}
              {l.badge ? <Badge count={l.badge} label={pendingLabel} /> : null}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1 min-[1140px]:flex">
          {accountLinks.map((l) =>
            l.href === "/signup" ? (
              <Link key={l.href} href={l.href} className="ml-2 rounded-lg bg-gold px-4 py-2 font-bold text-navy no-underline hover:bg-[var(--gold-2)]">
                {l.label}
              </Link>
            ) : (
              <Link key={l.href} href={l.href} className={link}>{l.label}</Link>
            ),
          )}
          {profile && (
            <form action="/auth/signout" method="post">
              <button className={`${link} cursor-pointer`}>Sign out</button>
            </form>
          )}
        </div>

        {/* Phones and tablets */}
        <details className="group ml-auto min-[1140px]:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-lg px-3 font-semibold hover:bg-white/10">
            <Menu className="h-6 w-6" /> Menu
            <Badge count={pendingCount} label={pendingLabel} />
          </summary>
          <nav aria-label="Main" className="absolute inset-x-0 top-full border-t border-white/10 bg-navy px-4 pb-4 shadow-2xl">
            {[...memberLinks, ...aboutLinks, ...accountLinks].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center border-b border-white/10 py-3 text-lg font-semibold text-white no-underline">
                {l.label}
                {"badge" in l && typeof l.badge === "number" ? <Badge count={l.badge} label={pendingLabel} /> : null}
              </Link>
            ))}
            {profile && (
              <form action="/auth/signout" method="post">
                <button className="w-full py-3 text-left text-lg font-semibold text-white">Sign out</button>
              </form>
            )}
          </nav>
        </details>
      </div>
    </header>
  );
}

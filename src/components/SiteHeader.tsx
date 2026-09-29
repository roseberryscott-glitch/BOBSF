import Link from "next/link";
import { getViewer } from "@/lib/auth";

export async function SiteHeader() {
  const { profile } = await getViewer();
  const approved = profile?.status === "approved";

  return (
    <header className="bg-primary text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-2xl font-bold text-white no-underline">
          BOBSF
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-lg">
          {approved && (
            <>
              <Link className="text-white" href="/events">Calendar</Link>
              <Link className="text-white" href="/forums">Forums</Link>
              <Link className="text-white" href="/members">Members</Link>
              {(profile.role === "leader" || profile.role === "admin") && (
                <Link className="text-white" href="/email">Email</Link>
              )}
              {profile.role === "admin" && (
                <Link className="text-white" href="/admin">Admin</Link>
              )}
            </>
          )}
        </nav>
        <div className="flex items-center gap-4 text-lg">
          {profile ? (
            <>
              {approved && (
                <Link className="text-white" href="/profile">My profile</Link>
              )}
              <form action="/auth/signout" method="post">
                <button className="cursor-pointer text-white underline underline-offset-4">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link className="text-white" href="/login">Sign in</Link>
              <Link className="text-white" href="/signup">Join</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

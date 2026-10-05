import Link from "next/link";
import { Messages } from "@/components/Messages";
import { GROUPS } from "@/lib/groups";
import { signUp } from "./actions";

export const metadata = { title: "Join" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title">Ask to join BOBSF</h1>
      <p className="mb-6">
        An admin reviews every registration before you can see the site. Once you&apos;re approved,
        you&apos;ll fill out your member profile.
      </p>
      <Messages error={sp.error} />
      <form action={signUp} className="card space-y-6">
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input className="input" id="full_name" name="full_name" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
          <span className="hint">At least 10 characters.</span>
        </div>
        <fieldset>
          <legend className="label">Branch of service</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <label key={g.id} className="flex min-h-12 items-center gap-3 rounded-md border-2 border-border px-3">
                <input type="radio" name="group_id" value={g.id} required className="h-5 w-5" />
                {g.isBranch ? g.name : "Friends (not a veteran)"}
              </label>
            ))}
          </div>
          <span className="hint">If you served in more than one branch, pick the one you most identify with.</span>
        </fieldset>
        <div>
          <label className="label" htmlFor="verification_note">How can we confirm who you are?</label>
          <textarea className="input min-h-28" id="verification_note" name="verification_note" />
          <span className="hint">
            For example, a member who can vouch for you, or your unit and where you served.
            Please don&apos;t send your DD-214 or any documents with your Social Security number.
          </span>
        </div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0" />
          <span>
            I understand that my branch leader and site admins can see the contact details I
            provide, and I agree to the <Link href="/terms">code of conduct</Link> and{" "}
            <Link href="/privacy">privacy policy</Link>. I am 18 or older.
          </span>
        </label>
        <button className="btn w-full">Send my registration</button>
      </form>
      <p className="mt-6">
        Already a member? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}

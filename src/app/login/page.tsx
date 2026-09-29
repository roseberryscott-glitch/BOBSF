import Link from "next/link";
import { Messages } from "@/components/Messages";
import { signIn } from "./actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title">Sign in</h1>
      <Messages error={sp.error} message={sp.message} />
      <form action={signIn} className="card space-y-5">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn w-full">Sign in</button>
        <p>
          <Link href="/forgot">Forgot your password?</Link>
        </p>
      </form>
      <p className="mt-6">
        Not a member yet? <Link href="/signup">Ask to join</Link>
      </p>
    </div>
  );
}

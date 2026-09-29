import { Messages } from "@/components/Messages";
import { sendPasswordReset } from "../login/actions";

export const metadata = { title: "Reset password" };

export default async function ForgotPage(props: PageProps<"/forgot">) {
  const sp = await props.searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title">Reset your password</h1>
      <Messages error={sp.error} message={sp.message} />
      <form action={sendPasswordReset} className="card space-y-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <button className="btn w-full">Email me a reset link</button>
      </form>
    </div>
  );
}

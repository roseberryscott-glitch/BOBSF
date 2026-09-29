import { redirect } from "next/navigation";
import { Messages } from "@/components/Messages";
import { getViewer } from "@/lib/auth";
import { updatePassword } from "../login/actions";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const { user } = await getViewer();
  if (!user) redirect("/forgot");
  const sp = await props.searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title">Choose a new password</h1>
      <Messages error={sp.error} />
      <form action={updatePassword} className="card space-y-5">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input className="input" id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
          <span className="hint">At least 10 characters.</span>
        </div>
        <button className="btn w-full">Save password</button>
      </form>
    </div>
  );
}

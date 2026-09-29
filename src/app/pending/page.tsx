import { redirect } from "next/navigation";
import { Messages } from "@/components/Messages";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Waiting for approval" };

export default async function PendingPage(props: PageProps<"/pending">) {
  const sp = await props.searchParams;
  const { profile } = await getViewer();
  if (profile?.status === "approved") redirect("/");

  const body =
    profile?.status === "rejected"
      ? "We weren't able to approve your registration. If you think this is a mistake, please contact an admin you know."
      : profile?.status === "suspended"
        ? "Your account is currently suspended. Please contact an admin."
        : "Thanks for registering. An admin will review your request, and we'll email you as soon as you're approved.";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title">
        {profile?.status === "rejected" || profile?.status === "suspended" ? "Account not active" : "Waiting for approval"}
      </h1>
      <Messages message={sp.message} />
      <p className="text-lg">{body}</p>
    </div>
  );
}

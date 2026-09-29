import Link from "next/link";
import { redirect } from "next/navigation";
import { unsubscribe } from "@/lib/unsubscribe";

export const metadata = { title: "Stop emails" };

async function confirm(formData: FormData) {
  "use server";
  const ok = await unsubscribe(String(formData.get("token")), String(formData.get("type")));
  redirect(`/unsubscribe?done=${ok ? "1" : "0"}`);
}

// A button rather than an automatic unsubscribe, because email scanners
// open links and would otherwise unsubscribe people by accident.
export default async function UnsubscribePage(props: PageProps<"/unsubscribe">) {
  const sp = await props.searchParams;
  const what = sp.type === "forum" ? "discussion reply emails" : "announcement emails";

  if (sp.done) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="page-title">{sp.done === "1" ? "You're unsubscribed" : "That link didn't work"}</h1>
        <p>
          {sp.done === "1"
            ? "You won't get these emails anymore."
            : "It may be out of date. You can change your email settings on your profile."}{" "}
          You can change this any time on <Link href="/profile">your profile</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title">Stop {what}?</h1>
      <form action={confirm} className="card space-y-4">
        <input type="hidden" name="token" value={String(sp.token ?? "")} />
        <input type="hidden" name="type" value={String(sp.type ?? "")} />
        <p>You&apos;ll still get emails about your account, like approvals and password resets.</p>
        <button className="btn">Yes, stop these emails</button>
      </form>
    </div>
  );
}

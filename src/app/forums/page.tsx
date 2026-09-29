import Link from "next/link";
import { BranchBadge } from "@/components/BranchBadge";
import { requireApproved } from "@/lib/auth";

export const metadata = { title: "Forums" };

export default async function ForumsPage() {
  const { supabase } = await requireApproved();
  const { data: forums } = await supabase
    .from("forums")
    .select("id, name, description, group_id, sort_order, threads(count)")
    .order("sort_order");

  return (
    <div>
      <h1 className="page-title">Forums</h1>
      <ul className="space-y-4">
        {(forums ?? []).map((f) => {
          const count = (f.threads as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <li key={f.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/forums/${f.id}`} className="text-2xl font-semibold">{f.name}</Link>
                  {f.group_id ? <BranchBadge groupId={f.group_id} size="sm" /> : null}
                </div>
                <p className="text-muted">{f.description}</p>
              </div>
              <p className="text-muted">{count} {count === 1 ? "discussion" : "discussions"}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const COLUMNS = { forum: "email_forum", announcements: "email_announcements" } as const;

export async function unsubscribe(token: string, type: string) {
  const column = COLUMNS[type as keyof typeof COLUMNS];
  if (!column || !/^[0-9a-f-]{36}$/i.test(token)) return false;
  const { data } = await createAdminClient()
    .from("profiles")
    .update({ [column]: false })
    .eq("unsubscribe_token", token)
    .select("id");
  return !!data?.length;
}

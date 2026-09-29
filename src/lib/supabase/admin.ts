import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses privacy rules. Only use on the server, after checking the caller
// is allowed to do what they're asking (e.g. sending bulk email).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

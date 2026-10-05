import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/url";

// Bypasses privacy rules. Only use on the server, after checking the caller
// is allowed to do what they're asking (e.g. sending bulk email).
export function createAdminClient() {
  return createClient(
    supabaseUrl(),
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/url";

export function createClient() {
  return createBrowserClient(
    supabaseUrl(),
    supabaseAnonKey(),
  );
}

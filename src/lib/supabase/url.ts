// The Supabase project address, cleaned up. People often paste the
// dashboard address or the ".../rest/v1/" API address instead of the plain
// project URL, which makes every login fail with "Invalid path specified".
export function supabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const dashboard = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i.exec(raw);
  if (dashboard) return `https://${dashboard[1]}.supabase.co`;
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`).origin;
  } catch {
    return raw;
  }
}

export function supabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
}

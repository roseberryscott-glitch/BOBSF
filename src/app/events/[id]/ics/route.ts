import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email";

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

// "Add to my calendar": works with Apple, Google and Outlook calendars.
export async function GET(_req: NextRequest, ctx: RouteContext<"/events/[id]/ics">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!e) return new NextResponse("Not found", { status: 404 });

  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 2 * 3600 * 1000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BOBSF//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@bobsf`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    e.location ? `LOCATION:${icsText(e.location)}` : null,
    `DESCRIPTION:${icsText((e.description ?? "") + "\n\n" + siteUrl(`/events/${e.id}`))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="bobsf-event.ics"`,
    },
  });
}

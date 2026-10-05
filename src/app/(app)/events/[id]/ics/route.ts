import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email";
import { isoToLocalInput, SITE_TIMEZONE } from "@/lib/time";

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

// "Add to my calendar": works with Apple, Google and Outlook calendars.
export async function GET(_req: NextRequest, ctx: RouteContext<"/events/[id]/ics">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).eq("status", "approved").maybeSingle();
  if (!e) return new NextResponse("Not found", { status: 404 });

  // Local time with the time zone name, so repeats stay at the same clock time.
  const local = (iso: string) => isoToLocalInput(iso).replace(/[-:]/g, "") + "00";
  const end = new Date(new Date(e.starts_at).getTime() + 2 * 3600 * 1000).toISOString();
  const rule =
    e.repeat === "weekly" || e.repeat === "biweekly" || e.repeat === "monthly"
      ? `RRULE:FREQ=${e.repeat === "monthly" ? "MONTHLY" : "WEEKLY"}${e.repeat === "biweekly" ? ";INTERVAL=2" : ""}${
          e.repeat_until ? `;UNTIL=${e.repeat_until.replace(/-/g, "")}T235959Z` : ""
        }`
      : null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BOBSF//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@bobsf`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART;TZID=${SITE_TIMEZONE}:${local(e.starts_at)}`,
    `DTEND;TZID=${SITE_TIMEZONE}:${local(end)}`,
    rule,
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

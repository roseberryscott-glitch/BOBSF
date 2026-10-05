// Event times are entered and shown in the club's time zone (SITE_TIMEZONE).
export const SITE_TIMEZONE = process.env.NEXT_PUBLIC_SITE_TIMEZONE ?? "America/New_York";

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function monthLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function dayParts(iso: string) {
  const d = new Date(iso);
  const f = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: SITE_TIMEZONE, ...opts }).format(d);
  return { weekday: f({ weekday: "short" }), month: f({ month: "short" }), day: f({ day: "numeric" }) };
}

// Offset in minutes of SITE_TIMEZONE from UTC at the given instant.
function tzOffsetMinutes(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - at.getTime()) / 60000;
}

// "2026-10-10T18:00" from a datetime-local input, read as SITE_TIMEZONE.
export function localInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes handle the hour around daylight-saving changes.
  let guess = naive - tzOffsetMinutes(new Date(naive)) * 60000;
  guess = naive - tzOffsetMinutes(new Date(guess)) * 60000;
  return new Date(guess).toISOString();
}

// Inverse of localInputToIso, for pre-filling edit forms.
export function isoToLocalInput(iso: string) {
  const d = new Date(iso);
  const local = new Date(d.getTime() + tzOffsetMinutes(d) * 60000);
  return local.toISOString().slice(0, 16);
}

// Events stay listed as "upcoming" for a few hours after they start.
export function upcomingCutoffIso() {
  return new Date(Date.now() - 6 * 3600 * 1000).toISOString();
}

// "2026-10-05": the calendar day of an instant in SITE_TIMEZONE.
export function zonedDay(iso: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

// Plain calendar-day arithmetic on "YYYY-MM-DD" strings (no time zones involved).
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// The weeks shown for a month ("2026-10"), Sunday first, as "YYYY-MM-DD" days.
export function monthGrid(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const start = addDays(`${month}-01`, -first.getUTCDay());
  const weeks: string[][] = [];
  for (let day = start; weeks.length < 6; ) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(day, i));
    if (weeks.length >= 4 && !week.some((d) => d.startsWith(month))) break;
    weeks.push(week);
    day = addDays(day, 7);
  }
  return weeks;
}

export function addMonths(month: string, n: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

export function monthName(month: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

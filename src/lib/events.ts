import { addDays, isoToLocalInput, localInputToIso } from "@/lib/time";

// Repeating events. Each event stores its first date and time; repeats keep
// the same local time (e.g. Fridays at 7 PM) and are worked out here.

export const REPEATS = {
  none: "Doesn't repeat",
  weekly: "Every week",
  biweekly: "Every other week",
  monthly: "Every month",
} as const;
export type Repeat = keyof typeof REPEATS;

export type Repeating = { starts_at: string; repeat: Repeat; repeat_until: string | null };

const dayNumber = (day: string) => Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 86400000;

function addMonthsKeepDay(day: string, n: number) {
  const y = +day.slice(0, 4);
  const m = +day.slice(5, 7) - 1 + n;
  const d = +day.slice(8, 10);
  const date = new Date(Date.UTC(y, m, d));
  // Skip months that don't have this date (e.g. the 31st).
  if (date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

// Start times (ISO) of an event on days from `fromDay` up to, not including, `toDay`.
export function occurrences(e: Repeating, fromDay: string, toDay: string, max = 400): string[] {
  const local = isoToLocalInput(e.starts_at);
  const first = local.slice(0, 10);
  const time = local.slice(11, 16);
  if (e.repeat === "none" || !(e.repeat in REPEATS)) {
    return first >= fromDay && first < toDay ? [e.starts_at] : [];
  }

  const last = e.repeat_until && e.repeat_until < toDay ? addDays(e.repeat_until, 1) : toDay;
  const days: string[] = [];
  if (e.repeat === "monthly") {
    const skip = Math.max(0, (+fromDay.slice(0, 4) - +first.slice(0, 4)) * 12 + (+fromDay.slice(5, 7) - +first.slice(5, 7)) - 1);
    for (let n = skip; days.length < max; n++) {
      const day = addMonthsKeepDay(first, n);
      if (day === null) continue;
      if (day >= last) break;
      if (day >= fromDay) days.push(day);
    }
  } else {
    const step = e.repeat === "weekly" ? 7 : 14;
    const behind = dayNumber(fromDay) - dayNumber(first);
    let day = behind > 0 ? addDays(first, Math.ceil(behind / step) * step) : first;
    for (; day < last && days.length < max; day = addDays(day, step)) days.push(day);
  }
  return days.map((d) => localInputToIso(`${d}T${time}`)!);
}

// "Every Friday", "Every other Friday", "Every month on the 9th", plus "until …".
export function describeRepeat(e: Repeating) {
  if (e.repeat === "none" || !(e.repeat in REPEATS)) return null;
  const local = isoToLocalInput(e.starts_at);
  const first = new Date(`${local.slice(0, 10)}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(first);
  const dom = first.getUTCDate();
  const suffix = dom % 10 === 1 && dom !== 11 ? "st" : dom % 10 === 2 && dom !== 12 ? "nd" : dom % 10 === 3 && dom !== 13 ? "rd" : "th";
  const base =
    e.repeat === "weekly" ? `Every ${weekday}` : e.repeat === "biweekly" ? `Every other ${weekday}` : `Every month on the ${dom}${suffix}`;
  if (!e.repeat_until) return base;
  const until = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${e.repeat_until}T00:00:00Z`),
  );
  return `${base} until ${until}`;
}

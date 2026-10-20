/**
 * Day bounds in the user's timezone (America/Toronto).
 *
 * The server runs in UTC, so computing "today" with local Date methods
 * shifts the end of day by several hours for a Montréal user: evening
 * sessions could fall in or out of the Today filter incorrectly. These
 * helpers compute the UTC instants of Toronto midnights via Intl.
 */

const TIME_ZONE = "America/Toronto";

function tzOffsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant of midnight (00:00 Toronto) on the given Toronto date. */
function torontoMidnightUtc(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  const offset = tzOffsetMs(new Date(guess));
  let utc = guess - offset;
  // The offset can differ on the corrected side of a DST transition.
  const refined = tzOffsetMs(new Date(utc));
  if (refined !== offset) utc = guess - refined;
  return new Date(utc);
}

function torontoTodayParts(now: Date): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(now)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return { year: parts.year, month: parts.month, day: parts.day };
}

function addDays(
  parts: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/** [start, end) UTC bounds of "today" in Toronto. */
export function torontoTodayRange(now: Date): { start: Date; end: Date } {
  const today = torontoTodayParts(now);
  const tomorrow = addDays(today, 1);
  return {
    start: torontoMidnightUtc(today.year, today.month, today.day),
    end: torontoMidnightUtc(tomorrow.year, tomorrow.month, tomorrow.day),
  };
}

/** [start, end) UTC bounds of "this week": today through 7 days out, Toronto. */
export function torontoWeekRange(now: Date): { start: Date; end: Date } {
  const today = torontoTodayParts(now);
  const last = addDays(today, 7);
  return {
    start: torontoMidnightUtc(today.year, today.month, today.day),
    end: torontoMidnightUtc(last.year, last.month, last.day),
  };
}

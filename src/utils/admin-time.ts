// The admin area has one user in one place, so every day boundary is pinned to
// a single zone. That keeps the server render (UTC on Vercel) and the browser
// agreeing on which day an entry falls on. Safe to import from the client.

const TIME_ZONE = "Asia/Ho_Chi_Minh";
// Vietnam has no daylight saving, so the offset is a constant.
const UTC_OFFSET = "+07:00";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const readParts = (iso: string) => {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(new Date(iso))) {
    parts[part.type] = part.value;
  }
  return parts;
};

/** `YYYY-MM-DD` + optional `HH:mm`, read as admin-zone wall time → ISO. */
export const toIso = (day: string, time = "00:00") =>
  new Date(`${day}T${time}:00${UTC_OFFSET}`).toISOString();

/** ISO → `YYYY-MM-DD` in the admin zone. */
export const dayOf = (iso: string) => {
  const { year, month, day } = readParts(iso);
  return `${year}-${month}-${day}`;
};

/** ISO → `HH:mm` in the admin zone. */
export const timeOf = (iso: string) => {
  const { hour, minute } = readParts(iso);
  return `${hour}:${minute}`;
};

export const today = () => dayOf(new Date().toISOString());

export const currentMonth = () => today().slice(0, 7);

/** `YYYY-MM` → the half-open `[from, to)` range covering that month. */
export const monthRange = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const next =
    monthIndex === 12
      ? `${year + 1}-01`
      : `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return {
    from: new Date(`${month}-01T00:00:00${UTC_OFFSET}`),
    to: new Date(`${next}-01T00:00:00${UTC_OFFSET}`),
  };
};

/** `YYYY-MM-DD` moved by `delta` days. */
export const shiftDay = (day: string, delta: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** Every day from `from` to `to`, both inclusive, in order. */
export const daysInRange = (from: string, to: string) => {
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) days.push(day);
  return days;
};

/** 0 is Monday, 6 is Sunday. */
export const weekdayOf = (day: string) =>
  (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Every day of `month` (`YYYY-MM`) as `YYYY-MM-DD`, in order. */
export const daysOfMonth = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const count = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`
  );
};

/**
 * `month` laid out as calendar weeks starting on Monday. `null` pads the
 * first and last week where the neighbouring months would be.
 */
export const weeksOfMonth = (month: string) => {
  const days = daysOfMonth(month);
  // getUTCDay: Sunday is 0. Shift so Monday is 0.
  const offset = (new Date(`${days[0]}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array<null>(offset).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    weeks.push(cells.slice(start, start + 7));
  }
  return weeks;
};

/** `YYYY-MM` moved by `delta` months. */
export const shiftMonth = (month: string, delta: number) => {
  const [year, monthIndex] = month.split("-").map(Number);
  // Date.UTC normalises an out-of-range month into the neighbouring year.
  const shifted = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** `YYYY-MM` → `October 2026`. */
export const formatMonth = (month: string) =>
  monthFormatter.format(new Date(`${month}-01T00:00:00Z`));

/** `YYYY-MM-DD` → `Mon, 05 Oct 2026`. */
export const formatDay = (day: string) =>
  dayFormatter.format(new Date(`${day}T00:00:00Z`));

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

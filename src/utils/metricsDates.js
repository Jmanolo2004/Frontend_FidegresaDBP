export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function customRangeDates(from, to) {
  const valid = value => typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && formatLocalDate(parseLocalDate(value)) === value;
  if (!valid(from) || !valid(to)) return null;
  return from <= to ? { from, to } : { from: to, to: from };
}

export function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function calendarDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first.getFullYear(), first.getMonth(), index - offset + 1);
    return { date, value: formatLocalDate(date), inMonth: date.getMonth() === first.getMonth() };
  });
}

export function inclusiveDayCount(from, to) {
  const start = parseLocalDate(from);
  const end = parseLocalDate(to);
  const utc = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc(end) - utc(start)) / 86400000) + 1;
}

export function rangeDates(range, now = new Date()) {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  if (range === "all") return { from: "2000-01-01", to: formatLocalDate(to) };
  if (range === "today") return { from: formatLocalDate(to), to: formatLocalDate(to) };
  if (range === "7days") from.setDate(from.getDate() - 6);
  else if (range === "14days") from.setDate(from.getDate() - 13);
  else if (range === "30days") from.setDate(from.getDate() - 29);
  else if (range === "90days") from.setDate(from.getDate() - 89);
  else if (range === "quarter") from.setMonth(from.getMonth() - 2, 1);
  else if (range === "year") from.setMonth(0, 1);
  else from.setDate(1);
  return { from: formatLocalDate(from), to: formatLocalDate(to) };
}

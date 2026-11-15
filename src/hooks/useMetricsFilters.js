import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const RANGES = ["all", "today", "7days", "14days", "30days", "90days", "month", "quarter", "year", "custom"];
const PROGRAMS = ["all", "stamps", "cashback", "giftcard", "tiers"];

function intervalForRange(range, from, to) {
  if (range === "all") return "year";
  if (range === "year") return "month";
  if (range === "quarter" || range === "30days" || range === "90days") return "week";
  if (range !== "custom") return "day";
  const span = (new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000;
  return span > 365 ? "year" : span > 120 ? "month" : span > 21 ? "week" : "day";
}

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeDates(range, now = new Date()) {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  if (range === "all") return { from: "2000-01-01", to: dateString(to) };
  if (range === "today") return { from: dateString(to), to: dateString(to) };
  if (range === "7days") from.setDate(from.getDate() - 6);
  else if (range === "14days") from.setDate(from.getDate() - 13);
  else if (range === "30days") from.setDate(from.getDate() - 29);
  else if (range === "90days") from.setDate(from.getDate() - 89);
  else if (range === "quarter") from.setMonth(from.getMonth() - 2, 1);
  else if (range === "year") from.setMonth(0, 1);
  else from.setDate(1);
  return { from: dateString(from), to: dateString(to) };
}

export function useMetricsFilters() {
  const [params, setParams] = useSearchParams();
  const range = RANGES.includes(params.get("range")) ? params.get("range") : "year";
  const dates = useMemo(() => range === "custom" && params.get("from") && params.get("to")
    ? { from: params.get("from"), to: params.get("to") }
    : rangeDates(range), [range, params]);
  const filters = useMemo(() => ({
    program: PROGRAMS.includes(params.get("program")) ? params.get("program") : "all",
    range,
    interval: intervalForRange(range, dates.from, dates.to),
    ...dates,
    compare: "previous",
    branchId: params.get("branchId") || ""
  }), [range, dates, params]);
  const update = useCallback(changes => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined || (key === "range" && value === "month") || (key === "program" && value === "all")) next.delete(key);
        else next.set(key, String(value));
      });
      if (changes.range && changes.range !== "custom") {
        next.delete("from");
        next.delete("to");
      }
      if (changes.range && changes.range !== "custom" && changes.range !== range) {
        const nextDates = rangeDates(changes.range);
        next.set("from", nextDates.from);
        next.set("to", nextDates.to);
      }
      next.delete("compare");
      next.delete("interval");
      return next;
    }, { replace: true });
  }, [range, setParams]);
  return { filters, update };
}

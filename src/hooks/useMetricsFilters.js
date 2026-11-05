import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const PROGRAMS = ["all", "stamps", "cashback", "tiers", "giftcard"];
const RANGES = ["today", "7days", "30days", "month", "quarter", "year", "custom"];

function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeDates(range, now = new Date()) {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  if (range === "today") return { from: dateString(to), to: dateString(to) };
  if (range === "7days") from.setDate(from.getDate() - 6);
  else if (range === "30days") from.setDate(from.getDate() - 29);
  else if (range === "quarter") from.setMonth(from.getMonth() - 2, 1);
  else if (range === "year") from.setMonth(0, 1);
  else from.setDate(1);
  return { from: dateString(from), to: dateString(to) };
}

export function useMetricsFilters() {
  const [params, setParams] = useSearchParams();
  const program = PROGRAMS.includes(params.get("program")) ? params.get("program") : "all";
  const range = RANGES.includes(params.get("range")) ? params.get("range") : "month";
  const dates = useMemo(() => range === "custom" && params.get("from") && params.get("to")
    ? { from: params.get("from"), to: params.get("to") }
    : rangeDates(range), [range, params]);
  const filters = useMemo(() => ({
    program,
    range,
    ...dates,
    compare: ["previous", "lastYear"].includes(params.get("compare")) ? params.get("compare") : "previous",
    branchId: params.get("branchId") || ""
  }), [program, range, dates, params]);
  const update = useCallback(changes => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined || (key === "program" && value === "all") || (key === "range" && value === "month") || (key === "compare" && value === "previous")) next.delete(key);
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
      return next;
    }, { replace: true });
  }, [range, setParams]);
  return { filters, update };
}

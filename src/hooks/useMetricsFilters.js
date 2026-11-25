import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { customRangeDates, inclusiveDayCount, rangeDates } from "../utils/metricsDates";

const RANGES = ["all", "today", "7days", "14days", "30days", "90days", "month", "quarter", "year", "custom"];
const DEFAULT_RANGE = "month";
const PROGRAMS = ["all", "stamps", "cashback", "giftcard", "tiers"];

function intervalForRange(range, from, to) {
  if (range === "all") return "year";
  if (range === "year") return "month";
  if (range === "quarter" || range === "30days" || range === "90days") return "week";
  if (range !== "custom") return "day";
  const span = inclusiveDayCount(from, to) - 1;
  return span > 365 ? "year" : span > 120 ? "month" : span > 21 ? "week" : "day";
}

export function useMetricsFilters() {
  const [params, setParams] = useSearchParams();
  const requestedRange = RANGES.includes(params.get("range")) ? params.get("range") : DEFAULT_RANGE;
  const customDates = requestedRange === "custom" ? customRangeDates(params.get("from"), params.get("to")) : null;
  const invalidCustomRange = requestedRange === "custom" && !customDates;
  const range = invalidCustomRange ? DEFAULT_RANGE : requestedRange;
  const dates = useMemo(() => range === "custom"
    ? customRangeDates(params.get("from"), params.get("to"))
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
        if (value === "" || value === null || value === undefined || (key === "range" && value === DEFAULT_RANGE) || (key === "program" && value === "all")) next.delete(key);
        else next.set(key, String(value));
      });
      if (changes.range && changes.range !== "custom") {
        next.delete("from");
        next.delete("to");
      }
      if (changes.range) next.delete("page");
      next.delete("compare");
      next.delete("interval");
      return next;
    }, { replace: true, preventScrollReset: true });
  }, [setParams]);
  return { filters, update, invalidCustomRange };
}

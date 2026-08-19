export type ComparisonKind =
  | "MONTH_OVER_MONTH"
  | "PRIOR_YEAR_MONTH"
  | "SAME_YTD"
  | "ROLLING_12_MONTHS"
  | "ANNUALIZED_SCENARIO";

export interface PeriodWindow {
  start: string;
  end: string;
  granularity: "MONTH";
  months: number;
}

export interface TemporalComparison {
  kind: ComparisonKind;
  current: PeriodWindow;
  comparison: PeriodWindow;
  scenarioLabel?: string;
}

function monthIndex(period: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error(`Invalid monthly period: ${period}`);
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

function assertWindow(window: PeriodWindow): void {
  const span = monthIndex(window.end) - monthIndex(window.start) + 1;
  if (span !== window.months || span <= 0) throw new Error("Period window months do not match its bounds.");
}

export function validateTemporalComparison(comparison: TemporalComparison): void {
  assertWindow(comparison.current);
  assertWindow(comparison.comparison);
  const currentStart = monthIndex(comparison.current.start);
  const currentEnd = monthIndex(comparison.current.end);
  const priorStart = monthIndex(comparison.comparison.start);
  const priorEnd = monthIndex(comparison.comparison.end);

  if (comparison.kind !== "ANNUALIZED_SCENARIO" && comparison.scenarioLabel) {
    throw new Error("Scenario labels are only valid for annualized scenarios.");
  }
  if (comparison.kind === "ANNUALIZED_SCENARIO") {
    if (!comparison.scenarioLabel?.trim()) throw new Error("Annualization must be explicitly labeled as a scenario.");
    return;
  }
  if (comparison.current.months !== comparison.comparison.months) {
    throw new Error("Comparison windows must contain the same number of months.");
  }

  switch (comparison.kind) {
    case "MONTH_OVER_MONTH":
      if (comparison.current.months !== 1 || currentStart - priorStart !== 1) {
        throw new Error("Month-over-month requires consecutive single months.");
      }
      break;
    case "PRIOR_YEAR_MONTH":
      if (comparison.current.months !== 1 || currentStart - priorStart !== 12) {
        throw new Error("Prior-year month requires the same month one year earlier.");
      }
      break;
    case "SAME_YTD": {
      const currentMonth = Number(comparison.current.end.slice(5));
      const priorMonth = Number(comparison.comparison.end.slice(5));
      if (
        currentMonth !== priorMonth ||
        comparison.current.start.slice(5) !== "01" ||
        comparison.comparison.start.slice(5) !== "01" ||
        currentEnd - priorEnd !== 12
      ) {
        throw new Error("Same-YTD requires January-through-the-same-month windows in adjacent years.");
      }
      break;
    }
    case "ROLLING_12_MONTHS":
      if (comparison.current.months !== 12 || comparison.comparison.months !== 12) {
        throw new Error("Rolling-12 comparisons require two 12-month windows.");
      }
      if (priorEnd + 1 !== currentStart) {
        throw new Error("Rolling-12 comparison windows must be consecutive and non-overlapping.");
      }
      break;
  }
}

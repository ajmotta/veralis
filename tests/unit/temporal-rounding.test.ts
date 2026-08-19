import assert from "node:assert/strict";
import test from "node:test";

import { formatForDisplay } from "../../src/domain/calculations/rounding.ts";
import { validateTemporalComparison } from "../../src/domain/calculations/temporal.ts";

test("accepts only aligned same-YTD windows", () => {
  assert.doesNotThrow(() =>
    validateTemporalComparison({
      kind: "SAME_YTD",
      current: { start: "2026-01", end: "2026-07", months: 7, granularity: "MONTH" },
      comparison: { start: "2025-01", end: "2025-07", months: 7, granularity: "MONTH" },
    }),
  );
  assert.throws(() =>
    validateTemporalComparison({
      kind: "SAME_YTD",
      current: { start: "2026-01", end: "2026-07", months: 7, granularity: "MONTH" },
      comparison: { start: "2025-01", end: "2025-12", months: 12, granularity: "MONTH" },
    }),
  );
});

test("requires annualization to be labeled as a scenario", () => {
  assert.throws(() =>
    validateTemporalComparison({
      kind: "ANNUALIZED_SCENARIO",
      current: { start: "2026-01", end: "2026-07", months: 7, granularity: "MONTH" },
      comparison: { start: "2025-01", end: "2025-12", months: 12, granularity: "MONTH" },
    }),
  );
});

test("applies pt-BR display rounding only at the boundary", () => {
  assert.equal(formatForDisplay(1234.567, "BRL"), "R$ 1.234,57");
  assert.equal(formatForDisplay(0.1234, "PERCENT"), "12,3%");
  assert.equal(formatForDisplay(7.64, "PERCENTAGE_POINT"), "7,6 p.p.");
  assert.equal(formatForDisplay(1.236, "RATIO"), "1,24");
});

import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_SOURCE_OF_TRUTH, deriveDemoPeriods } from "../../scripts/generate-demo-fixture.ts";
import { buildPerformanceBridge } from "../../src/domain/reconciliation/performance-bridge.ts";

test("the Escola Horizonte source of truth tells the required reconciled story", () => {
  const periods = deriveDemoPeriods(DEMO_SOURCE_OF_TRUTH);
  const prior = periods.find((entry) => entry.period === "2025-07")!;
  const current = periods.find((entry) => entry.period === "2026-07")!;
  const newClass = DEMO_SOURCE_OF_TRUTH.classes.find((entry) => entry.classId === "T06")!;
  const currentMonth = DEMO_SOURCE_OF_TRUTH.months.find((entry) => entry.period === "2026-07")!;

  assert.ok(current.students > prior.students);
  assert.ok(current.netRevenue > prior.netRevenue);
  assert.ok(current.netRevenue / current.students < prior.netRevenue / prior.students);
  assert.ok(current.discounts / current.grossRevenue > prior.discounts / prior.grossRevenue);
  assert.ok(current.payroll > prior.payroll);
  assert.ok((currentMonth.enrollmentByClass.T06 ?? 0) / newClass.capacity < 0.6);
  assert.ok(current.operatingResult / current.netRevenue < prior.operatingResult / prior.netRevenue);
  assert.ok(Math.abs(buildPerformanceBridge(prior, current).reconciliationDelta) <= 0.02);
});

test("January 2026 contains the extraordinary revenue that masks part of the run-rate decline", () => {
  const january = DEMO_SOURCE_OF_TRUTH.months.find((entry) => entry.period === "2026-01")!;
  const ordinaryMonths = DEMO_SOURCE_OF_TRUTH.months.filter((entry) => entry.period.startsWith("2026-") && entry.period !== "2026-01");
  assert.ok(january.otherRevenue > Math.max(...ordinaryMonths.map((entry) => entry.otherRevenue)) * 5);
});

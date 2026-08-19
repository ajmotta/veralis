import assert from "node:assert/strict";
import test from "node:test";

import { calculateP0Metrics } from "../../src/domain/calculations/metrics.ts";
import type { FinancialPeriodInput } from "../../src/domain/schemas/financial.ts";

const prior: FinancialPeriodInput = {
  period: "2025-07",
  grossRevenue: 200,
  discounts: 20,
  netRevenue: 180,
  variableCosts: 20,
  payroll: 80,
  fixedCosts: 40,
  financialResult: -2,
  operatingResult: 40,
  netResult: 38,
  students: 90,
  classes: 5,
  capacity: 100,
  staff: 9,
};

const current: FinancialPeriodInput = {
  ...prior,
  period: "2026-07",
  grossRevenue: 230,
  discounts: 46,
  netRevenue: 184,
  variableCosts: 24,
  payroll: 100,
  fixedCosts: 45,
  financialResult: -3,
  operatingResult: 15,
  netResult: 12,
  students: 100,
  classes: 6,
  capacity: 120,
  staff: 11,
  openReceivables: 9.2,
  writeOffs: 1.84,
};

test("calculates the P0 metrics without rounding the inputs", () => {
  const byId = Object.fromEntries(calculateP0Metrics(current, prior).map((metric) => [metric.id, metric]));
  assert.equal(byId.revenue_growth.value, 4 / 180);
  assert.equal(byId.student_growth.value, 10 / 90);
  assert.equal(byId.revenue_per_student.value, 1.84);
  assert.equal(byId.discount_rate.value, 0.2);
  assert.equal(byId.payroll_growth.value, 0.25);
  assert.equal(byId.payroll_over_revenue.value, 100 / 184);
  assert.equal(byId.operating_margin.value, 15 / 184);
  assert.equal(byId.occupancy.value, 100 / 120);
  assert.ok(Math.abs(Number(byId.open_receivables_rate.value) - 0.05) < 1e-12);
  assert.ok(Math.abs(Number(byId.effective_loss_rate.value) - 0.01) < 1e-12);
});

test("marks metrics UNKNOWN instead of inventing a denominator", () => {
  const missing = { ...current, netRevenue: 0, students: 0, capacity: 0, openReceivables: undefined, writeOffs: undefined };
  const byId = Object.fromEntries(calculateP0Metrics(missing).map((metric) => [metric.id, metric]));
  assert.equal(byId.revenue_growth.status, "UNKNOWN");
  assert.equal(byId.revenue_per_student.status, "UNKNOWN");
  assert.equal(byId.occupancy.status, "UNKNOWN");
  assert.equal(byId.open_receivables_rate.status, "UNKNOWN");
  assert.equal(byId.effective_loss_rate.status, "UNKNOWN");
  assert.equal(byId.break_even_students.status, "UNKNOWN");
});

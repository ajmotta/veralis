import assert from "node:assert/strict";
import test from "node:test";

import { buildPerformanceBridge } from "../../src/domain/reconciliation/performance-bridge.ts";
import type { FinancialPeriodInput } from "../../src/domain/schemas/financial.ts";

const period = (overrides: Partial<FinancialPeriodInput>): FinancialPeriodInput => ({
  period: "2025-07",
  grossRevenue: 220,
  discounts: 20,
  netRevenue: 200,
  variableCosts: 20,
  payroll: 100,
  fixedCosts: 40,
  financialResult: -5,
  operatingResult: 40,
  netResult: 35,
  students: 100,
  classes: 5,
  capacity: 100,
  staff: 9,
  ...overrides,
});

test("builds a MECE bridge that reconciles at full precision", () => {
  const current = period({
    period: "2026-07",
    netRevenue: 224,
    variableCosts: 25,
    payroll: 118,
    fixedCosts: 44,
    financialResult: -7,
    operatingResult: 37,
    netResult: 30,
    students: 110,
  });
  const bridge = buildPerformanceBridge(period({}), current);
  assert.equal(bridge.revenueVolume, 20);
  assert.equal(bridge.revenuePriceDiscountMix, 4);
  assert.equal(bridge.variableCosts, -5);
  assert.equal(bridge.people, -18);
  assert.equal(bridge.fixedOperating, -4);
  assert.equal(bridge.financialNonOperating, -2);
  assert.equal(bridge.totalChange, -5);
  assert.equal(bridge.bridgedChange, -5);
  assert.equal(bridge.reconciliationDelta, 0);
  assert.equal(bridge.reconciliationStatus, "PASS");
});

test("rejects a volume bridge without a valid base student count", () => {
  assert.throws(() => buildPerformanceBridge(period({ students: 0 }), period({ period: "2026-07" })));
});

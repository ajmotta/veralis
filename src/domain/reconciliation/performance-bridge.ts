import type { FinancialPeriodInput } from "../schemas/financial.ts";
import { CURRENCY_RECONCILIATION_TOLERANCE } from "../schemas/financial.ts";

export interface PerformanceBridge {
  periodA: string;
  periodB: string;
  revenueVolume: number;
  revenuePriceDiscountMix: number;
  variableCosts: number;
  people: number;
  fixedOperating: number;
  financialNonOperating: number;
  totalChange: number;
  bridgedChange: number;
  reconciliationDelta: number;
  reconciliationStatus: "PASS" | "FAIL";
}

export function buildPerformanceBridge(
  periodA: FinancialPeriodInput,
  periodB: FinancialPeriodInput,
): PerformanceBridge {
  if (periodA.students <= 0) throw new Error("Period A students must be greater than zero for the volume bridge.");

  const baseRevenuePerStudent = periodA.netRevenue / periodA.students;
  const revenueVolume = (periodB.students - periodA.students) * baseRevenuePerStudent;
  const revenuePriceDiscountMix = periodB.netRevenue - periodA.netRevenue - revenueVolume;
  const variableCosts = -(periodB.variableCosts - periodA.variableCosts);
  const people = -(periodB.payroll - periodA.payroll);
  const fixedOperating = -(periodB.fixedCosts - periodA.fixedCosts);
  const financialNonOperating = periodB.financialResult - periodA.financialResult;
  const totalChange = periodB.netResult - periodA.netResult;
  const bridgedChange =
    revenueVolume +
    revenuePriceDiscountMix +
    variableCosts +
    people +
    fixedOperating +
    financialNonOperating;
  const reconciliationDelta = totalChange - bridgedChange;

  return {
    periodA: periodA.period,
    periodB: periodB.period,
    revenueVolume,
    revenuePriceDiscountMix,
    variableCosts,
    people,
    fixedOperating,
    financialNonOperating,
    totalChange,
    bridgedChange,
    reconciliationDelta,
    reconciliationStatus:
      Math.abs(reconciliationDelta) <= CURRENCY_RECONCILIATION_TOLERANCE ? "PASS" : "FAIL",
  };
}

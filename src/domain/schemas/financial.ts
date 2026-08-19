import type { Evidence, PeriodFinancials, PeriodOperations } from "./case-state.ts";

export const CURRENCY_RECONCILIATION_TOLERANCE = 0.02;
export const PERCENTAGE_POINT_TOLERANCE = 0.01;

export const CANONICAL_ACCOUNTS = [
  "REVENUE_TUITION",
  "REVENUE_OTHER",
  "DISCOUNTS",
  "VARIABLE_COSTS",
  "PEOPLE",
  "FIXED_OPERATING_COSTS",
  "FINANCIAL_AND_NON_OPERATING",
  "OPERATING_RESULT",
  "NET_RESULT",
] as const;

export type CanonicalAccount = (typeof CANONICAL_ACCOUNTS)[number];
export type NormalizationStatus = "MAPPED" | "UNMAPPED";

export interface SourceFinancialRow {
  label: string;
  period: string;
  value: number;
  sourceFile: string;
  sheet?: string;
  row?: number;
  column?: string;
}

export interface NormalizedFinancialRow extends SourceFinancialRow {
  canonicalAccount: CanonicalAccount | "UNMAPPED";
  confidence: number;
  status: NormalizationStatus;
  evidence: Evidence;
}

export interface NormalizedFinancialDataset {
  periods: PeriodFinancials[];
  rows: NormalizedFinancialRow[];
  unmappedRows: NormalizedFinancialRow[];
  reconciliation: Array<{
    period: string;
    declaredOperatingResult?: number;
    calculatedOperatingResult: number;
    delta: number;
    status: "PASS" | "FAIL" | "NOT_PROVIDED";
  }>;
}

export interface FinancialPeriodInput extends PeriodFinancials, PeriodOperations {
  grossTuitionRevenue?: number;
  otherRevenue?: number;
  openReceivables?: number;
  writeOffs?: number;
}

export type MetricId =
  | "revenue_growth"
  | "student_growth"
  | "revenue_per_student"
  | "discount_rate"
  | "payroll_growth"
  | "payroll_over_revenue"
  | "operating_margin"
  | "occupancy"
  | "contribution_margin_per_class"
  | "break_even_students"
  | "open_receivables_rate"
  | "effective_loss_rate";

export interface DeterministicMetric {
  id: MetricId;
  period: string;
  value: number | "UNKNOWN";
  status: "AVAILABLE" | "UNKNOWN" | "DATA_QUALITY_FAIL";
  unit: "BRL" | "PERCENT" | "RATIO" | "COUNT";
  formula: string;
  reason?: string;
}

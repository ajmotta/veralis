export const UNKNOWN = "UNKNOWN" as const;

export type UserRole = "OWNER" | "ACADEMIC_MANAGER";
export type ClaimType =
  | "FACT"
  | "CALCULATION"
  | "INFERENCE"
  | "HYPOTHESIS"
  | "RECOMMENDATION"
  | "UNKNOWN";

export type MetricStatus = "AVAILABLE" | "UNKNOWN" | "CONFLICT" | "DATA_QUALITY_FAIL";

export interface Evidence {
  id: string;
  sourceType: "FILE" | "USER_STATEMENT" | "CALCULATION";
  sourceFile?: string;
  sheet?: string;
  row?: number;
  column?: string;
  period?: string;
  rawValue: string | number | null;
  normalizedValue: string | number | null;
  unit?: string;
  confidence: number;
}

export interface Calculation {
  id: string;
  formulaId: string;
  formulaVersion: "1.0.0";
  period: string;
  inputRefs: string[];
  rawResult: number;
  displayedResult: string;
  unit: "BRL" | "PERCENT" | "PERCENTAGE_POINT" | "RATIO" | "COUNT";
  status: "PASS" | "FAIL" | "UNKNOWN";
}

export interface Claim {
  id: string;
  statement: string;
  type: ClaimType;
  evidenceRefs: string[];
  confidence: number;
}

export interface SourceConflict {
  metric: string;
  period: string;
  sources: string[];
  values: number[];
  recommendedResolution: string;
}

export interface PeriodFinancials {
  period: string;
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  variableCosts: number;
  payroll: number;
  fixedCosts: number;
  financialResult: number;
  operatingResult: number;
  netResult: number;
}

export interface PeriodOperations {
  period: string;
  students: number;
  classes: number;
  capacity: number;
  staff: number;
}

export interface MetricValue {
  id: string;
  period: string;
  value: number | typeof UNKNOWN;
  status: MetricStatus;
  unit: Calculation["unit"];
  evidenceRefs: string[];
  calculationRef?: string;
}

export interface CaseState {
  caseId: string;
  version: number;
  business: {
    name: string;
    segment: "EARLY_CHILDHOOD_PRIVATE";
    city: "São Paulo";
    state: "SP";
    currency: "BRL";
  };
  user: {
    role: UserRole;
    financialLiteracy: "LOW" | "MEDIUM" | "HIGH" | typeof UNKNOWN;
    preferredDetail: "CONCISE" | "STANDARD" | "DETAILED";
    decisionAuthority: boolean | typeof UNKNOWN;
  };
  objective: {
    currentQuestion: string;
    decisionUnderAnalysis: string | typeof UNKNOWN;
  };
  sources: {
    files: string[];
    userStatements: Array<{ id: string; text: string; turn: number }>;
    conflicts: SourceConflict[];
  };
  financial: { periods: PeriodFinancials[] };
  operations: { periods: PeriodOperations[] };
  metrics: { values: MetricValue[] };
  reasoning: {
    facts: Claim[];
    calculations: Claim[];
    inferences: Claim[];
    hypotheses: Claim[];
    recommendations: Claim[];
    unknowns: Claim[];
  };
  evidence: Evidence[];
  calculations: Calculation[];
  quality: {
    reconciliation: "PASS" | "FAIL" | "NOT_RUN";
    confidence: number;
    warnings: string[];
  };
  conversation: {
    currentTurn: number;
    openQuestion: string | null;
    corrections: Array<{ turn: number; statementId: string; replacement: string }>;
  };
}


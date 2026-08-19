import type { Calculation, Claim } from "../../domain/schemas/case-state";

export interface Recommendation {
  action: string;
  why: string;
  expectedImpact: string;
  evidenceRefs: string[];
  assumptions: string[];
  confidence: number;
  reversibility: "HIGH" | "MEDIUM" | "LOW";
  risk: string;
}

export interface StructuredResponse {
  directAnswer: string;
  diagnosis: { primaryDriver: string; secondaryDrivers: string[] };
  evidence: { items: Claim[] };
  calculations: { items: Calculation[] };
  meceBridge: { items: Array<{ category: string; amount: number }> };
  assumptions: { items: string[] };
  unknowns: { items: string[] };
  expertViews: {
    active: Array<"CFO" | "OPERATIONS" | "ACADEMIC" | "GROWTH">;
    views: Array<{ lens: ExpertLens; statement: string; evidenceRefs: string[] }>;
  };
  disagreements: { items: string[] };
  risks: { items: string[] };
  recommendation: {
    immediate: Recommendation | null;
    next30Days: Recommendation[];
    doNotDo: string[];
  };
  nextQuestion: string | null;
  confidence: number;
  humanReviewRequired: boolean;
  reviewType?: "accounting" | "legal" | "tax" | "regulatory" | null;
}

export const EXPERT_LENSES = ["CFO", "OPERATIONS", "ACADEMIC", "GROWTH"] as const;
export type ExpertLens = (typeof EXPERT_LENSES)[number];

export interface ExpertView {
  lens: ExpertLens;
  statement: string;
  evidenceRefs: string[];
  disagreementKey?: string;
}

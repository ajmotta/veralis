import { analyzeCase } from "../../src/ai/responses-client";
import type { CaseState } from "../../src/domain/schemas/case-state";

const caseState: CaseState = {
  caseId: "live-smoke",
  version: 1,
  business: {
    name: "Escola Horizonte",
    segment: "EARLY_CHILDHOOD_PRIVATE",
    city: "São Paulo",
    state: "SP",
    currency: "BRL",
  },
  user: {
    role: "OWNER",
    financialLiteracy: "MEDIUM",
    preferredDetail: "CONCISE",
    decisionAuthority: true,
  },
  objective: {
    currentQuestion: "O que aconteceu com a margem operacional?",
    decisionUnderAnalysis: "recuperar margem",
  },
  sources: { files: ["synthetic-smoke.csv"], userStatements: [], conflicts: [] },
  financial: { periods: [] },
  operations: { periods: [] },
  metrics: { values: [] },
  reasoning: {
    facts: [],
    calculations: [{
      id: "claim-margin",
      statement: "A margem operacional caiu 5,0 p.p.",
      type: "CALCULATION",
      evidenceRefs: ["calc-margin"],
      confidence: 1,
    }],
    inferences: [],
    hypotheses: [],
    recommendations: [],
    unknowns: [],
  },
  evidence: [{
    id: "ev-result",
    sourceType: "FILE",
    sourceFile: "synthetic-smoke.csv",
    period: "2026-07",
    rawValue: 100,
    normalizedValue: 100,
    unit: "BRL",
    confidence: 1,
  }],
  calculations: [{
    id: "calc-margin",
    formulaId: "operating_margin_change",
    formulaVersion: "1.0.0",
    period: "2026-07",
    inputRefs: ["ev-result"],
    rawResult: -5,
    displayedResult: "-5,0 p.p.",
    unit: "PERCENTAGE_POINT",
    status: "PASS",
  }],
  quality: { reconciliation: "PASS", confidence: 1, warnings: [] },
  conversation: { currentTurn: 1, openQuestion: null, corrections: [] },
};

const result = await analyzeCase(caseState);

// Metadata only: never print prompts, outputs, document data, or credentials.
console.log(JSON.stringify({
  mode: result.mode,
  verificationOk: result.verification.ok,
  issueCodes: result.verification.issues.map((issue) => issue.code),
  provider: result.provider,
  fallbackReason: result.fallbackReason,
}));

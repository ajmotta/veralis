import type { CaseState } from "../../domain/schemas/case-state";
import type { StructuredResponse } from "../schemas/response";
import { selectNextQuestion } from "./unknowns";

export const SAFE_ANALYSIS_FAILURE_MESSAGE =
  "Não consegui concluir a análise agora. Seus dados não foram alterados. Tente novamente.";

export function buildSafeFallback(caseState: CaseState): StructuredResponse {
  const unknowns = [
    ...caseState.reasoning.unknowns.map((claim) => claim.statement),
    ...caseState.sources.conflicts.map((conflict) => `${conflict.metric} em ${conflict.period}: CONFLICT`),
  ];
  const risks = [...caseState.quality.warnings];
  if (caseState.quality.reconciliation === "FAIL") {
    risks.unshift("A reconciliação determinística falhou.");
  }
  return {
    directAnswer: SAFE_ANALYSIS_FAILURE_MESSAGE,
    diagnosis: { primaryDriver: "UNKNOWN", secondaryDrivers: [] },
    evidence: { items: [] },
    calculations: { items: caseState.calculations.map((item) => ({ ...item, inputRefs: [...item.inputRefs] })) },
    meceBridge: { items: [] },
    assumptions: { items: [] },
    unknowns: { items: unknowns },
    expertViews: { active: [], views: [] },
    disagreements: {
      items: caseState.sources.conflicts.map(
        (conflict) => `CONFLICT preservado para ${conflict.metric} em ${conflict.period}: ${conflict.recommendedResolution}`,
      ),
    },
    risks: { items: risks },
    recommendation: { immediate: null, next30Days: [], doNotDo: [] },
    nextQuestion: selectNextQuestion(caseState),
    confidence: 0,
    humanReviewRequired: caseState.quality.reconciliation === "FAIL",
    reviewType: null,
  };
}

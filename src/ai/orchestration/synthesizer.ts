import { UNKNOWN, type CaseState, type Claim } from "../../domain/schemas/case-state";
import { buildExpertViews } from "../experts";
import type { ExpertView, Recommendation, StructuredResponse } from "../schemas/response";
import { routeExpertLenses } from "./routing";
import { selectNextQuestion } from "./unknowns";
import { claimMatchesIntent, classifyCfoQuestion } from "./question-intent";

function uniqueClaims(claims: Claim[]): Claim[] {
  const seen = new Set<string>();
  return claims.filter((claim) => {
    if (seen.has(claim.id)) return false;
    seen.add(claim.id);
    return true;
  });
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ""))];
}

function primaryClaim(caseState: CaseState): Claim | undefined {
  const candidates = [
    ...caseState.reasoning.inferences,
    ...caseState.reasoning.calculations,
    ...caseState.reasoning.facts,
  ];
  const intent = classifyCfoQuestion(caseState.objective.currentQuestion);
  return intent === "GENERAL"
    ? candidates[0]
    : candidates.find((claim) => claimMatchesIntent(claim.statement, intent));
}

function buildDisagreements(caseState: CaseState, views: ExpertView[]): string[] {
  const conflicts = caseState.sources.conflicts.map(
    (conflict) => `CONFLICT preservado para ${conflict.metric} em ${conflict.period}: ${conflict.recommendedResolution}`,
  );
  const grouped = new Map<string, ExpertView[]>();
  for (const view of views) {
    if (!view.disagreementKey) continue;
    grouped.set(view.disagreementKey, [...(grouped.get(view.disagreementKey) ?? []), view]);
  }
  const lensDisagreements = [...grouped.entries()].flatMap(([key, items]) => {
    const statements = uniqueStrings(items.map((item) => item.statement));
    return statements.length > 1
      ? [`Divergência preservada (${key}): ${statements.join(" | ")}`]
      : [];
  });
  return [...conflicts, ...lensDisagreements];
}

function recommendationFromClaim(
  claim: Claim,
  caseState: CaseState,
  assumptions: string[],
): Recommendation | null {
  const calculationIds = new Set(caseState.calculations.map((item) => item.id));
  if (assumptions.length === 0 || !claim.evidenceRefs.some((ref) => calculationIds.has(ref))) return null;
  return {
    action: claim.statement,
    why: "Recomendação condicionada às premissas e aos cálculos citados.",
    expectedImpact: "Somente o impacto documentado nos cálculos citados.",
    evidenceRefs: [...claim.evidenceRefs],
    assumptions,
    confidence: Math.max(0, Math.min(1, claim.confidence)),
    reversibility: "HIGH",
    risk: "O resultado pode mudar se as premissas não se confirmarem.",
  };
}

function detectReview(caseState: CaseState): StructuredResponse["reviewType"] {
  const text = `${caseState.objective.currentQuestion} ${caseState.objective.decisionUnderAnalysis}`
    .toLocaleLowerCase("pt-BR");
  if (/regulat|licen[çc]a|aluno.*professor/u.test(text)) return "regulatory";
  if (/jur[ií]dic|contrato|lei\b/u.test(text)) return "legal";
  if (/tribut|imposto|fiscal/u.test(text)) return "tax";
  if (/cont[aá]bil|auditor/u.test(text)) return "accounting";
  return null;
}

export function synthesizeDeterministicResponse(caseState: CaseState): StructuredResponse {
  const route = routeExpertLenses(caseState);
  const routedViews = buildExpertViews(caseState, route.active);
  const lead = primaryClaim(caseState);
  const conflictLead = caseState.sources.conflicts[0];
  const directAnswer = lead?.statement
    ?? (conflictLead
      ? `Há um conflito de fontes para ${conflictLead.metric} em ${conflictLead.period}; não é seguro concluir antes de definir a fonte canônica.`
      : "Ainda não há evidência suficiente para concluir com segurança.");
  const assumptions = uniqueStrings(caseState.reasoning.hypotheses.map((claim) => claim.statement));
  const recommendationClaims = caseState.reasoning.recommendations
    .map((claim) => recommendationFromClaim(claim, caseState, assumptions))
    .filter((item): item is Recommendation => item !== null);
  const unknownMetrics = caseState.metrics.values
    .filter((metric) => metric.value === UNKNOWN || metric.status === "UNKNOWN" || metric.status === "DATA_QUALITY_FAIL")
    .map((metric) => `${metric.id} em ${metric.period}: UNKNOWN`);
  const conflictUnknowns = caseState.sources.conflicts.map(
    (conflict) => `${conflict.metric} em ${conflict.period}: CONFLICT`,
  );
  const reviewType = detectReview(caseState);
  const risks = [...caseState.quality.warnings];
  if (caseState.quality.reconciliation === "FAIL") {
    risks.unshift("A reconciliação determinística falhou; valores não devem embasar uma decisão.");
  }

  return {
    directAnswer,
    diagnosis: {
      primaryDriver: lead?.statement ?? "UNKNOWN",
      secondaryDrivers: caseState.reasoning.inferences.slice(lead ? 1 : 0, 3).map((claim) => claim.statement),
    },
    evidence: {
      items: uniqueClaims([
        ...caseState.reasoning.facts,
        ...caseState.reasoning.calculations,
        ...caseState.reasoning.inferences,
      ]),
    },
    calculations: { items: caseState.calculations.map((item) => ({ ...item, inputRefs: [...item.inputRefs] })) },
    meceBridge: {
      items: caseState.calculations
        .filter((item) => item.formulaId.toLocaleLowerCase("pt-BR").includes("bridge") && item.status === "PASS")
        .map((item) => ({ category: item.formulaId, amount: item.rawResult })),
    },
    assumptions: { items: assumptions },
    unknowns: {
      items: uniqueStrings([
        ...caseState.reasoning.unknowns.map((claim) => claim.statement),
        ...unknownMetrics,
        ...conflictUnknowns,
      ]),
    },
    expertViews: {
      active: route.active,
      views: routedViews.map(({ lens, statement, evidenceRefs }) => ({ lens, statement, evidenceRefs })),
    },
    disagreements: { items: buildDisagreements(caseState, routedViews) },
    risks: { items: uniqueStrings(risks) },
    recommendation: {
      immediate: recommendationClaims[0] ?? null,
      next30Days: recommendationClaims.slice(1, 3),
      doNotDo: [],
    },
    nextQuestion: selectNextQuestion(caseState),
    confidence: Math.max(0, Math.min(1, caseState.quality.confidence)),
    humanReviewRequired: reviewType !== null || caseState.quality.reconciliation === "FAIL",
    reviewType,
  };
}

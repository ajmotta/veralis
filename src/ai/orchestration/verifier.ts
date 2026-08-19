import type { Calculation, CaseState, Claim } from "../../domain/schemas/case-state";
import type { Recommendation, StructuredResponse } from "../schemas/response";
import { hasExactlyOneQuestion } from "./unknowns";

export type VerificationIssueCode =
  | "CALCULATION_MUTATED"
  | "CONFIDENCE_OUT_OF_RANGE"
  | "CONFLICT_HIDDEN"
  | "DIRECT_ANSWER_TOO_LONG"
  | "INVALID_EVIDENCE_REF"
  | "LENS_NOT_ACTIVE"
  | "MISSING_CALCULATION_REF"
  | "MISSING_EVIDENCE"
  | "MISSING_QUESTION"
  | "MULTIPLE_QUESTIONS"
  | "RECOMMENDATION_WITHOUT_ASSUMPTION"
  | "RECONCILIATION_HIDDEN";

export interface VerificationIssue {
  code: VerificationIssueCode;
  path: string;
  message: string;
}

export interface VerificationResult {
  ok: boolean;
  issues: VerificationIssue[];
}

const MATERIAL_CLAIMS = new Set(["FACT", "CALCULATION", "INFERENCE", "RECOMMENDATION"]);

function wordCount(value: string): number {
  return value.trim() === "" ? 0 : value.trim().split(/\s+/u).length;
}

function validReferenceIds(caseState: CaseState): Set<string> {
  return new Set([
    ...caseState.evidence.map((item) => item.id),
    ...caseState.calculations.map((item) => item.id),
  ]);
}

function calculationIds(caseState: CaseState): Set<string> {
  return new Set(caseState.calculations.map((item) => item.id));
}

function checkRefs(
  refs: string[],
  path: string,
  validRefs: Set<string>,
  issues: VerificationIssue[],
): void {
  if (refs.length === 0) {
    issues.push({ code: "MISSING_EVIDENCE", path, message: "Material claim has no evidence reference." });
  }
  for (const ref of refs) {
    if (!validRefs.has(ref)) {
      issues.push({ code: "INVALID_EVIDENCE_REF", path, message: `Unknown evidence reference: ${ref}` });
    }
  }
}

function checkNumericClaim(
  statement: string,
  refs: string[],
  path: string,
  calcIds: Set<string>,
  issues: VerificationIssue[],
): void {
  if (/\d/u.test(statement) && !refs.some((ref) => calcIds.has(ref))) {
    issues.push({ code: "MISSING_CALCULATION_REF", path, message: "Numeric claim does not cite a calculation." });
  }
}

function checkClaim(
  claim: Claim,
  path: string,
  validRefs: Set<string>,
  calcIds: Set<string>,
  issues: VerificationIssue[],
): void {
  if (claim.confidence < 0 || claim.confidence > 1) {
    issues.push({ code: "CONFIDENCE_OUT_OF_RANGE", path, message: "Claim confidence must be between 0 and 1." });
  }
  if (MATERIAL_CLAIMS.has(claim.type)) checkRefs(claim.evidenceRefs, path, validRefs, issues);
  checkNumericClaim(claim.statement, claim.evidenceRefs, path, calcIds, issues);
}

function checkRecommendation(
  recommendation: Recommendation,
  path: string,
  validRefs: Set<string>,
  calcIds: Set<string>,
  issues: VerificationIssue[],
): void {
  checkRefs(recommendation.evidenceRefs, path, validRefs, issues);
  if (!recommendation.evidenceRefs.some((ref) => calcIds.has(ref))) {
    issues.push({ code: "MISSING_CALCULATION_REF", path, message: "Recommendation must cite a deterministic calculation." });
  }
  if (recommendation.assumptions.length === 0) {
    issues.push({ code: "RECOMMENDATION_WITHOUT_ASSUMPTION", path, message: "Recommendation must state its assumptions." });
  }
  if (recommendation.confidence < 0 || recommendation.confidence > 1) {
    issues.push({ code: "CONFIDENCE_OUT_OF_RANGE", path, message: "Recommendation confidence must be between 0 and 1." });
  }
  checkNumericClaim(
    `${recommendation.action} ${recommendation.why} ${recommendation.expectedImpact}`,
    recommendation.evidenceRefs,
    path,
    calcIds,
    issues,
  );
}

function sameCalculation(left: Calculation, right: Calculation): boolean {
  return left.formulaId === right.formulaId
    && left.formulaVersion === right.formulaVersion
    && left.period === right.period
    && left.rawResult === right.rawResult
    && left.displayedResult === right.displayedResult
    && left.unit === right.unit
    && left.status === right.status
    && left.inputRefs.length === right.inputRefs.length
    && left.inputRefs.every((value, index) => value === right.inputRefs[index]);
}

export function verifyStructuredResponse(
  response: StructuredResponse,
  caseState: CaseState,
): VerificationResult {
  const issues: VerificationIssue[] = [];
  const validRefs = validReferenceIds(caseState);
  const calcIds = calculationIds(caseState);
  const engineCalculations = new Map(caseState.calculations.map((item) => [item.id, item]));

  if (wordCount(response.directAnswer) > 120) {
    issues.push({ code: "DIRECT_ANSWER_TOO_LONG", path: "directAnswer", message: "Direct answer exceeds 120 words." });
  }
  const directAnswerIsMeta = response.directAnswer.startsWith("Ainda não há evidência suficiente")
    || response.directAnswer.startsWith("Há um conflito de fontes")
    || response.directAnswer.startsWith("Não consegui concluir a análise agora");
  const directAnswerSupport = response.evidence.items.find(
    (claim) => claim.statement === response.directAnswer && claim.evidenceRefs.length > 0,
  );
  if (!directAnswerIsMeta && !directAnswerSupport) {
    issues.push({
      code: "MISSING_EVIDENCE",
      path: "directAnswer",
      message: "Direct answer must be traceable to an evidence item.",
    });
  }
  if (directAnswerSupport) {
    checkNumericClaim(response.directAnswer, directAnswerSupport.evidenceRefs, "directAnswer", calcIds, issues);
  }
  if (response.confidence < 0 || response.confidence > 1) {
    issues.push({ code: "CONFIDENCE_OUT_OF_RANGE", path: "confidence", message: "Response confidence must be between 0 and 1." });
  }

  response.evidence.items.forEach((claim, index) => {
    checkClaim(claim, `evidence.items[${index}]`, validRefs, calcIds, issues);
  });

  response.calculations.items.forEach((calculation, index) => {
    const source = engineCalculations.get(calculation.id);
    if (!source || !sameCalculation(calculation, source)) {
      issues.push({
        code: "CALCULATION_MUTATED",
        path: `calculations.items[${index}]`,
        message: "Response calculation differs from the deterministic engine output.",
      });
    }
  });

  const active = new Set(response.expertViews.active);
  response.expertViews.views.forEach((view, index) => {
    const path = `expertViews.views[${index}]`;
    if (!active.has(view.lens)) {
      issues.push({ code: "LENS_NOT_ACTIVE", path, message: `${view.lens} view was not activated by routing.` });
    }
    checkRefs(view.evidenceRefs, path, validRefs, issues);
    checkNumericClaim(view.statement, view.evidenceRefs, path, calcIds, issues);
  });

  if (response.recommendation.immediate) {
    checkRecommendation(response.recommendation.immediate, "recommendation.immediate", validRefs, calcIds, issues);
  }
  response.recommendation.next30Days.forEach((recommendation, index) => {
    checkRecommendation(recommendation, `recommendation.next30Days[${index}]`, validRefs, calcIds, issues);
  });

  const requiresQuestion = response.unknowns.items.length > 0 || caseState.sources.conflicts.length > 0;
  if (requiresQuestion && response.nextQuestion === null) {
    issues.push({ code: "MISSING_QUESTION", path: "nextQuestion", message: "A material unknown requires one question." });
  }
  if (response.nextQuestion !== null && !hasExactlyOneQuestion(response.nextQuestion)) {
    issues.push({ code: "MULTIPLE_QUESTIONS", path: "nextQuestion", message: "nextQuestion must contain exactly one question." });
  }

  const preservedText = [...response.disagreements.items, ...response.unknowns.items]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  for (const conflict of caseState.sources.conflicts) {
    const metric = conflict.metric.toLocaleLowerCase("pt-BR");
    const period = conflict.period.toLocaleLowerCase("pt-BR");
    if (!preservedText.includes(metric) || !preservedText.includes(period)) {
      issues.push({ code: "CONFLICT_HIDDEN", path: "disagreements", message: `Conflict ${conflict.metric}/${conflict.period} was not preserved.` });
    }
  }

  if (caseState.quality.reconciliation === "FAIL") {
    const riskText = response.risks.items.join(" ").toLocaleLowerCase("pt-BR");
    if (!riskText.includes("reconcil")) {
      issues.push({ code: "RECONCILIATION_HIDDEN", path: "risks", message: "Failed reconciliation must be disclosed." });
    }
  }

  return { ok: issues.length === 0, issues };
}

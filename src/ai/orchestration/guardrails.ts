import type { CaseState } from "../../domain/schemas/case-state";

export interface UntrustedDataEnvelope {
  trust: "UNTRUSTED_DATA";
  source: "DOCUMENT" | "USER_STATEMENT";
  content: string;
  instructionLikeContentDetected: boolean;
}

const INSTRUCTION_PATTERNS = [
  /ignore (all|any|the|previous).*(instruction|rule)/i,
  /ignore (todas|qualquer|as).*(instruç|regra)/i,
  /system prompt/i,
  /developer message/i,
  /revele?.*(segredo|prompt|chave)/i,
  /execute?.*(código|codigo|comando)/i,
];

export function containsInstructionLikeContent(content: string): boolean {
  return INSTRUCTION_PATTERNS.some((pattern) => pattern.test(content));
}

export function wrapUntrustedData(
  content: string,
  source: UntrustedDataEnvelope["source"] = "DOCUMENT",
): UntrustedDataEnvelope {
  return {
    trust: "UNTRUSTED_DATA",
    source,
    content,
    instructionLikeContentDetected: containsInstructionLikeContent(content),
  };
}

export function canonicalReasoningPayload(caseState: CaseState) {
  return {
    caseId: caseState.caseId,
    version: caseState.version,
    business: caseState.business,
    user: caseState.user,
    objective: {
      currentQuestion: wrapUntrustedData(caseState.objective.currentQuestion, "USER_STATEMENT"),
      decisionUnderAnalysis: caseState.objective.decisionUnderAnalysis,
    },
    sourceMetadata: {
      files: caseState.sources.files,
      conflicts: caseState.sources.conflicts,
      userStatements: caseState.sources.userStatements.map((statement) => ({
        id: statement.id,
        turn: statement.turn,
        data: wrapUntrustedData(statement.text, "USER_STATEMENT"),
      })),
    },
    financial: caseState.financial,
    operations: caseState.operations,
    metrics: caseState.metrics,
    reasoning: caseState.reasoning,
    evidence: caseState.evidence,
    calculations: caseState.calculations,
    quality: caseState.quality,
  } as const;
}

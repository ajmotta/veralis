import type { Claim, CaseState } from "../../domain/schemas/case-state";
import type { ExpertLens, ExpertView } from "../schemas/response";

const CLAIM_TERMS: Record<ExpertLens, readonly string[]> = {
  CFO: ["receita", "resultado", "margem", "folha", "custo", "caixa", "desconto", "inadimpl"],
  OPERATIONS: ["aluno", "turma", "capacidade", "ocupação", "ocupacao", "equipe", "operação", "operacao"],
  ACADEMIC: ["equipe", "professor", "turma", "acadêm", "pedagóg", "regulat"],
  GROWTH: ["desconto", "matrícula", "matricula", "captação", "captacao", "conversão", "conversao", "retenção", "retencao"],
};

function materialClaims(caseState: CaseState): Claim[] {
  return [
    ...caseState.reasoning.facts,
    ...caseState.reasoning.calculations,
    ...caseState.reasoning.inferences,
  ];
}

export function buildExpertViews(caseState: CaseState, active: ExpertLens[]): ExpertView[] {
  const claims = materialClaims(caseState);
  return active.flatMap((lens) => {
    const terms = CLAIM_TERMS[lens];
    const matches = claims.filter((claim) => {
      const statement = claim.statement.toLocaleLowerCase("pt-BR");
      return claim.evidenceRefs.length > 0 && terms.some((term) => statement.includes(term));
    });

    return matches.slice(0, 2).map((claim) => ({
      lens,
      statement: claim.statement,
      evidenceRefs: [...claim.evidenceRefs],
    }));
  });
}

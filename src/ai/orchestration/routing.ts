import type { CaseState } from "../../domain/schemas/case-state";
import type { ExpertLens } from "../schemas/response";

export interface LensRoute {
  active: ExpertLens[];
  reasons: Partial<Record<ExpertLens, string[]>>;
}

const LENS_TERMS: Record<ExpertLens, readonly string[]> = {
  CFO: [
    "profit", "lucro", "resultado", "margin", "margem", "cash", "caixa",
    "cost", "custo", "price", "preço", "preco", "discount", "desconto",
    "receivable", "receb", "debt", "dívida", "divida", "scenario", "cenário", "cenario",
  ],
  OPERATIONS: [
    "class", "turma", "capacity", "capacidade", "occupancy", "ocupação", "ocupacao",
    "staff allocation", "alocação", "alocacao", "opening", "abertura", "closing", "fechamento",
  ],
  ACADEMIC: [
    "staff reduction", "reduzir equipe", "cortar equipe", "demitir", "staff addition",
    "contratar", "class composition", "composição", "composicao", "academic", "acadêmic",
    "pedagóg", "pedagog", "educational regulation", "regulação", "regulacao",
  ],
  GROWTH: [
    "discount", "desconto", "new enrollment", "nova matrícula", "nova matricula", "cac",
    "conversion", "conversão", "conversao", "retention", "retenção", "retencao",
    "acquisition", "aquisição", "aquisicao", "captação", "captacao",
  ],
};

const normalize = (value: string) => value.toLocaleLowerCase("pt-BR");

export function routeExpertLenses(caseState: CaseState): LensRoute {
  const query = normalize(
    `${caseState.objective.currentQuestion} ${caseState.objective.decisionUnderAnalysis}`,
  );
  const active: ExpertLens[] = [];
  const reasons: LensRoute["reasons"] = {};

  for (const lens of ["CFO", "OPERATIONS", "ACADEMIC", "GROWTH"] as const) {
    const matched = LENS_TERMS[lens].filter((term) => query.includes(term));
    if (matched.length > 0) {
      active.push(lens);
      reasons[lens] = matched;
    }
  }

  // Financial decision support always has a CFO interpretation, even when the
  // user's wording does not contain a finance keyword.
  if (!active.includes("CFO")) {
    active.unshift("CFO");
    reasons.CFO = ["default_financial_oversight"];
  }

  return { active, reasons };
}

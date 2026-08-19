const CFO_SCOPE = [
  /escol|creche|educaç|pedag|acad[eê]mi/u,
  /receita|fatur|mensalidade|ticket|pre[çc]o|reajuste/u,
  /custo|despesa|folha|sal[aá]rio|contrat|demit|equipe|professor/u,
  /caixa|resultado|lucro|margem|dre|financeir|or[çc]amento/u,
  /aluno|matr[ií]cula|turma|vaga|capacidade|ocupa[çc][aã]o/u,
  /desconto|bolsa|inadimpl|receb|pagamento/u,
  /simula|cen[aá]rio|proje[çc][aã]o|planej|prioridade|a[çc][aã]o/u,
  /benchmark|performance|indicador|crescimento|reten[çc][aã]o|capta[çc][aã]o/u,
];

const CLEARLY_OUT_OF_SCOPE = [
  /receita (?:de|para) (?:bolo|comida|prato)/u,
  /previs[aã]o do tempo|clima hoje/u,
  /escrev[ae].*(?:poema|c[oó]digo|hist[oó]ria)/u,
  /pol[ií]tica partid[aá]ria|resultado do jogo/u,
];

export function isCfoQuestionInScope(question: string): boolean {
  const normalized = question.trim().toLocaleLowerCase("pt-BR");
  if (normalized.length < 3 || normalized.length > 800) return false;
  if (CLEARLY_OUT_OF_SCOPE.some((pattern) => pattern.test(normalized))) return false;
  return CFO_SCOPE.some((pattern) => pattern.test(normalized));
}

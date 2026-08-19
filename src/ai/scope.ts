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

const CONTEXTUAL_FOLLOW_UP = [
  /^(?:mais|menos) detalhes?(?:,? por favor)?[?.!]*$/u,
  /^(?:explique|explica|aprofunde|continue|continua|resuma)(?: melhor| mais)?[?.!]*$/u,
  /^(?:por qu[eê]|como assim|e agora|o que mais)[?.!]*$/u,
  /^(?:qual|quais|e qual|e quais) (?:o |a |os |as )?(?:pr[oó]ximo|pr[oó]xima|melhor|principal).{0,80}$/u,
  /^(?:mostre|detalhe) (?:o |a |os |as )?(?:c[aá]lculo|evid[eê]ncia|n[uú]mero|resultado).{0,60}$/u,
];

function normalizeQuestion(question: string): string {
  return question.trim().toLocaleLowerCase("pt-BR");
}

export function isCfoQuestionInScope(question: string): boolean {
  const normalized = normalizeQuestion(question);
  if (normalized.length < 3 || normalized.length > 800) return false;
  if (CLEARLY_OUT_OF_SCOPE.some((pattern) => pattern.test(normalized))) return false;
  return CFO_SCOPE.some((pattern) => pattern.test(normalized));
}

export function isCfoConversationInScope(question: string, previousQuestions: string[]): boolean {
  if (isCfoQuestionInScope(question)) return true;
  const normalized = normalizeQuestion(question);
  if (normalized.length < 3 || normalized.length > 800) return false;
  if (CLEARLY_OUT_OF_SCOPE.some((pattern) => pattern.test(normalized))) return false;
  const isFollowUp = CONTEXTUAL_FOLLOW_UP.some((pattern) => pattern.test(normalized));
  return isFollowUp && previousQuestions.slice(-4).some(isCfoQuestionInScope);
}

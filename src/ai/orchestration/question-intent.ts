export type CfoQuestionIntent =
  | "EXECUTIVE_REVIEW"
  | "RECEIVABLES"
  | "COST_STRUCTURE"
  | "PAYROLL"
  | "OCCUPANCY"
  | "MARGIN"
  | "REVENUE"
  | "DISCOUNTS"
  | "CASH"
  | "HIRING"
  | "PERFORMANCE"
  | "GENERAL";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function classifyCfoQuestion(question: string): CfoQuestionIntent {
  const query = normalize(question);
  if (/analise (?:exaustiva|executiva|completa)|analis.*arquivos|o que merece atencao|o que (?:voce )?pode concluir|conclus(?:ao|oes).*hipotese|diagnostico executivo|visao geral/.test(query)) return "EXECUTIVE_REVIEW";
  if (/inadimpl|contas a receber|recebiment|em aberto|aging/.test(query)) return "RECEIVABLES";
  if (/principal.*(?:custo|despesa)|linha.*(?:custo|despesa)|maior.*(?:custo|despesa)|(?:custo|despesa).*principal/.test(query)) return "COST_STRUCTURE";
  if (/folha|salario|pessoal|encargos/.test(query)) return "PAYROLL";
  if (/ocupacao|vaga|matricula|capacidade|turma/.test(query)) return "OCCUPANCY";
  if (/margem|rentabilidade/.test(query)) return "MARGIN";
  if (/receita|faturamento|mensalidade|ticket/.test(query)) return "REVENUE";
  if (/desconto|bolsa/.test(query)) return "DISCOUNTS";
  if (/caixa|liquidez|capital de giro|saldo bancario/.test(query)) return "CASH";
  if (/contrat|admit|demit|aumentar.*equipe|reduzir.*equipe/.test(query)) return "HIRING";
  if (/resultado|lucro|prejuizo|performance|desempenho|saude financeira/.test(query)) return "PERFORMANCE";
  return "GENERAL";
}

export function claimMatchesIntent(statement: string, intent: CfoQuestionIntent): boolean {
  const claim = normalize(statement);
  const patterns: Record<Exclude<CfoQuestionIntent, "GENERAL">, RegExp> = {
    EXECUTIVE_REVIEW: /margem|receita|resultado|folha|custo|ocupacao|desconto|risco|tendencia/,
    RECEIVABLES: /inadimpl|contas a receber|recebiment|em aberto|aging/,
    COST_STRUCTURE: /principal linha de custo|maior (?:linha de )?(?:custo|despesa)/,
    PAYROLL: /folha|salario|pessoal|encargos/,
    OCCUPANCY: /ocupacao|vaga|matricula|capacidade|turma/,
    MARGIN: /margem|rentabilidade/,
    REVENUE: /receita|faturamento|mensalidade|ticket/,
    DISCOUNTS: /desconto|bolsa/,
    CASH: /caixa|liquidez|capital de giro|saldo bancario/,
    HIRING: /contrat|admit|demit|equipe/,
    PERFORMANCE: /resultado|lucro|prejuizo|margem|receita/,
  };
  return intent === "GENERAL" || patterns[intent].test(claim);
}

import { UNKNOWN, type CaseState, type MetricValue, type SourceConflict } from "../../domain/schemas/case-state";

interface QuestionCandidate {
  score: number;
  key: string;
  question: string;
}

const METRIC_QUESTIONS: Record<string, string> = {
  contribution_margin_per_class: "Qual é o custo variável mensal da turma analisada?",
  break_even_students: "Qual é a mensalidade líquida média e o custo incremental por aluno?",
  open_receivables_rate: "Qual é o saldo de mensalidades vencidas no período?",
  effective_loss_rate: "Qual valor vencido foi definitivamente baixado como perda?",
  occupancy: "Qual é a capacidade de alunos da turma analisada?",
  payroll_over_revenue: "Qual é o custo total da folha no período analisado?",
  principal_cost_line: "Qual é o detalhamento das despesas por categoria no período analisado?",
  operating_margin: "Qual é a receita líquida e o resultado operacional do período analisado?",
  net_revenue: "Qual é a receita líquida do período analisado?",
  discount_rate: "Qual é o valor bruto das mensalidades e o total de descontos e bolsas no período?",
  cash_balance: "Qual é o saldo de caixa disponível e as obrigações dos próximos 30 dias?",
  monthly_hire_cost: "Qual é o custo mensal total da contratação considerada?",
  revenue_per_student: "Quantos alunos pagantes havia no período analisado?",
};

function questionForConflict(conflict: SourceConflict): QuestionCandidate {
  const sourceNames = conflict.sources.slice(0, 3).join(" ou ").replaceAll("?", "");
  return {
    score: 1_000,
    key: `conflict:${conflict.metric}:${conflict.period}`,
    question: `Para ${conflict.metric} em ${conflict.period}, qual fonte deve ser considerada canônica: ${sourceNames}?`,
  };
}

function questionForMetric(metric: MetricValue, query: string): QuestionCandidate {
  const metricKey = metric.id.toLocaleLowerCase("pt-BR");
  const synonymMatch = metricKey === "payroll_over_revenue"
    ? /folha|sal[aá]rio|pessoal/u.test(query)
    : metricKey === "principal_cost_line"
      ? /principal.*(?:custo|despesa)|linha.*(?:custo|despesa)|maior.*(?:custo|despesa)|(?:custo|despesa).*principal/u.test(query)
    : metricKey === "operating_margin"
      ? /margem|rentabilidade|resultado|lucro|preju[ií]zo|performance|desempenho/u.test(query)
    : metricKey === "net_revenue"
      ? /receita|faturamento|mensalidade|ticket/u.test(query)
    : metricKey === "discount_rate"
      ? /desconto|bolsa/u.test(query)
    : metricKey === "cash_balance"
      ? /caixa|liquidez|capital de giro|saldo banc[aá]rio/u.test(query)
    : metricKey === "monthly_hire_cost"
      ? /contrat|admit|demit|equipe/u.test(query)
    : metricKey === "occupancy"
      ? /ocupa|vaga|matr[ií]cula|turma/u.test(query)
      : metricKey === "revenue_per_student"
        ? /receita.*aluno|ticket/u.test(query)
        : false;
  const isRelevant = synonymMatch || query.includes(metricKey.replaceAll("_", " "));
  return {
    score: isRelevant ? 500 : 200,
    key: `metric:${metric.id}:${metric.period}`,
    question: METRIC_QUESTIONS[metricKey] ?? `Qual é o valor confirmado de ${metric.id} em ${metric.period}?`,
  };
}

export function selectNextQuestion(caseState: CaseState): string | null {
  const candidates: QuestionCandidate[] = caseState.sources.conflicts.map(questionForConflict);
  const query = caseState.objective.currentQuestion.toLocaleLowerCase("pt-BR");

  for (const metric of caseState.metrics.values) {
    if (metric.value === UNKNOWN || metric.status === "UNKNOWN" || metric.status === "DATA_QUALITY_FAIL") {
      candidates.push(questionForMetric(metric, query));
    }
  }

  if (caseState.objective.decisionUnderAnalysis === UNKNOWN) {
    candidates.push({
      score: 100,
      key: "decision_under_analysis",
      question: "Qual decisão financeira você precisa tomar com esta análise?",
    });
  }

  if (caseState.reasoning.unknowns.length > 0) {
    candidates.push({
      score: 300,
      key: `reasoning:${caseState.reasoning.unknowns[0].id}`,
      question: "Qual dado você consegue confirmar para resolver a principal lacuna desta análise?",
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return candidates[0]?.question ?? null;
}

export function hasExactlyOneQuestion(value: string | null): boolean {
  if (value === null) return false;
  return (value.match(/\?/g) ?? []).length === 1;
}

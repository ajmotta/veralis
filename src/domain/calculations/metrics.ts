import { UNKNOWN } from "../schemas/case-state.ts";
import type { DeterministicMetric, FinancialPeriodInput, MetricId } from "../schemas/financial.ts";

function available(
  id: MetricId,
  period: string,
  value: number,
  unit: DeterministicMetric["unit"],
  formula: string,
): DeterministicMetric {
  return Number.isFinite(value)
    ? { id, period, value, status: "AVAILABLE", unit, formula }
    : unknown(id, period, unit, formula, "O cálculo não produziu um número finito.");
}

function unknown(
  id: MetricId,
  period: string,
  unit: DeterministicMetric["unit"],
  formula: string,
  reason: string,
): DeterministicMetric {
  return { id, period, value: UNKNOWN, status: "UNKNOWN", unit, formula, reason };
}

function safeRatio(
  id: MetricId,
  period: string,
  numerator: number | undefined,
  denominator: number | undefined,
  unit: DeterministicMetric["unit"],
  formula: string,
  reason: string,
): DeterministicMetric {
  if (numerator === undefined || denominator === undefined || denominator === 0) {
    return unknown(id, period, unit, formula, reason);
  }
  return available(id, period, numerator / denominator, unit, formula);
}

export function calculateP0Metrics(
  current: FinancialPeriodInput,
  comparison?: FinancialPeriodInput,
): DeterministicMetric[] {
  const metrics: DeterministicMetric[] = [];
  const growth = (
    id: "revenue_growth" | "student_growth" | "payroll_growth",
    currentValue: number,
    priorValue: number | undefined,
  ) =>
    safeRatio(
      id,
      current.period,
      priorValue === undefined ? undefined : currentValue - priorValue,
      priorValue,
      "PERCENT",
      "(current - comparison) / comparison",
      "É necessário um período comparável com denominador diferente de zero.",
    );

  metrics.push(growth("revenue_growth", current.netRevenue, comparison?.netRevenue));
  metrics.push(growth("student_growth", current.students, comparison?.students));
  metrics.push(
    safeRatio(
      "revenue_per_student",
      current.period,
      current.netRevenue,
      current.students,
      "BRL",
      "netRevenue / students",
      "Receita líquida e número de alunos são obrigatórios.",
    ),
  );
  metrics.push(
    safeRatio(
      "discount_rate",
      current.period,
      current.discounts,
      current.grossRevenue,
      "PERCENT",
      "discounts / grossRevenue",
      "Receita bruta deve ser diferente de zero.",
    ),
  );
  metrics.push(growth("payroll_growth", current.payroll, comparison?.payroll));
  metrics.push(
    safeRatio(
      "payroll_over_revenue",
      current.period,
      current.payroll,
      current.netRevenue,
      "PERCENT",
      "payroll / netRevenue",
      "Receita líquida deve ser diferente de zero.",
    ),
  );
  metrics.push(
    safeRatio(
      "operating_margin",
      current.period,
      current.operatingResult,
      current.netRevenue,
      "PERCENT",
      "operatingResult / netRevenue",
      "Receita líquida deve ser diferente de zero.",
    ),
  );
  metrics.push(
    safeRatio(
      "occupancy",
      current.period,
      current.students,
      current.capacity,
      "PERCENT",
      "students / capacity",
      "Capacidade deve ser informada e diferente de zero.",
    ),
  );

  const contribution = current.netRevenue - current.variableCosts;
  metrics.push(
    safeRatio(
      "contribution_margin_per_class",
      current.period,
      contribution,
      current.classes,
      "BRL",
      "(netRevenue - variableCosts) / classes",
      "Número de turmas deve ser informado e diferente de zero.",
    ),
  );
  const unitContribution =
    current.students > 0 ? (current.netRevenue - current.variableCosts) / current.students : undefined;
  metrics.push(
    unitContribution === undefined || unitContribution <= 0
      ? unknown(
          "break_even_students",
          current.period,
          "COUNT",
          "(payroll + fixedCosts) / ((netRevenue - variableCosts) / students)",
          "Alunos e margem de contribuição unitária positiva são obrigatórios.",
        )
      : available(
          "break_even_students",
          current.period,
          (current.payroll + current.fixedCosts) / unitContribution,
          "COUNT",
          "(payroll + fixedCosts) / ((netRevenue - variableCosts) / students)",
        ),
  );
  metrics.push(
    safeRatio(
      "open_receivables_rate",
      current.period,
      current.openReceivables,
      current.netRevenue,
      "PERCENT",
      "openReceivables / netRevenue",
      "Saldo em aberto não foi informado; atraso não será inferido.",
    ),
  );
  metrics.push(
    safeRatio(
      "effective_loss_rate",
      current.period,
      current.writeOffs,
      current.netRevenue,
      "PERCENT",
      "writeOffs / netRevenue",
      "Baixas efetivas não foram informadas; perda não será inferida.",
    ),
  );

  return metrics;
}

import type { PeriodFinancials } from "../schemas/case-state.ts";
import {
  CURRENCY_RECONCILIATION_TOLERANCE,
  type CanonicalAccount,
  type NormalizedFinancialDataset,
  type NormalizedFinancialRow,
  type SourceFinancialRow,
} from "../schemas/financial.ts";

const EXACT_ALIASES: Record<string, CanonicalAccount> = {
  mensalidades: "REVENUE_TUITION",
  "receita de mensalidades": "REVENUE_TUITION",
  "receita escolar": "REVENUE_TUITION",
  "receita de mensalidades bruta": "REVENUE_TUITION",
  "receitas acessorias": "REVENUE_OTHER",
  "outras receitas operacionais": "REVENUE_OTHER",
  descontos: "DISCOUNTS",
  "descontos e bolsas": "DISCOUNTS",
  bolsas: "DISCOUNTS",
  "custos variaveis": "VARIABLE_COSTS",
  "materiais e alimentacao": "VARIABLE_COSTS",
  folha: "PEOPLE",
  "despesas com pessoal": "PEOPLE",
  "pessoal e encargos": "PEOPLE",
  "despesas operacionais fixas": "FIXED_OPERATING_COSTS",
  "custos fixos": "FIXED_OPERATING_COSTS",
  "resultado financeiro": "FINANCIAL_AND_NON_OPERATING",
  "resultado operacional": "OPERATING_RESULT",
  "resultado liquido": "NET_RESULT",
};

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

function candidateFor(label: string): { account: CanonicalAccount | "UNMAPPED"; confidence: number } {
  const normalized = normalizeLabel(label);
  const exact = EXACT_ALIASES[normalized];
  if (exact) return { account: exact, confidence: 1 };

  const candidates: Array<[RegExp, CanonicalAccount]> = [
    [/mensalidade|receita escolar/, "REVENUE_TUITION"],
    [/desconto|bolsa/, "DISCOUNTS"],
    [/folha|pessoal|salario|encargo/, "PEOPLE"],
    [/material|alimentacao|taxa de cartao|custo variavel/, "VARIABLE_COSTS"],
    [/aluguel|energia|manutencao|custo fixo|despesa fixa/, "FIXED_OPERATING_COSTS"],
    [/financeir/, "FINANCIAL_AND_NON_OPERATING"],
  ];
  const matches = candidates.filter(([pattern]) => pattern.test(normalized));
  if (matches.length === 1) return { account: matches[0][1], confidence: 0.85 };
  return { account: "UNMAPPED", confidence: 0 };
}

export function normalizeFinancialRows(rows: SourceFinancialRow[]): NormalizedFinancialDataset {
  const normalizedRows: NormalizedFinancialRow[] = rows.map((row, index) => {
    const candidate = candidateFor(row.label);
    const status = candidate.confidence >= 0.8 && candidate.account !== "UNMAPPED" ? "MAPPED" : "UNMAPPED";
    const canonicalAccount = status === "MAPPED" ? candidate.account : "UNMAPPED";
    return {
      ...row,
      canonicalAccount,
      confidence: candidate.confidence,
      status,
      evidence: {
        id: `ev:${row.sourceFile}:${row.sheet ?? "sheet"}:${row.row ?? index + 1}`,
        sourceType: "FILE",
        sourceFile: row.sourceFile,
        sheet: row.sheet,
        row: row.row,
        column: row.column,
        period: row.period,
        rawValue: row.value,
        normalizedValue: row.value,
        unit: "BRL",
        confidence: candidate.confidence,
      },
    };
  });

  const periodKeys = [...new Set(normalizedRows.map((row) => row.period))].sort();
  const periods: PeriodFinancials[] = [];
  const reconciliation: NormalizedFinancialDataset["reconciliation"] = [];

  for (const period of periodKeys) {
    const mapped = normalizedRows.filter((row) => row.period === period && row.status === "MAPPED");
    const sum = (account: CanonicalAccount) =>
      mapped.filter((row) => row.canonicalAccount === account).reduce((total, row) => total + Math.abs(row.value), 0);
    const signed = (account: CanonicalAccount) =>
      mapped.filter((row) => row.canonicalAccount === account).reduce((total, row) => total + row.value, 0);

    const tuition = sum("REVENUE_TUITION");
    const otherRevenue = sum("REVENUE_OTHER");
    const discounts = sum("DISCOUNTS");
    const variableCosts = sum("VARIABLE_COSTS");
    const payroll = sum("PEOPLE");
    const fixedCosts = sum("FIXED_OPERATING_COSTS");
    const financialResult = signed("FINANCIAL_AND_NON_OPERATING");
    const grossRevenue = tuition + otherRevenue;
    const netRevenue = grossRevenue - discounts;
    const operatingResult = netRevenue - variableCosts - payroll - fixedCosts;
    const netResult = operatingResult + financialResult;
    const declaredRows = mapped.filter((row) => row.canonicalAccount === "OPERATING_RESULT");
    const declaredOperatingResult = declaredRows.length
      ? declaredRows.reduce((total, row) => total + row.value, 0)
      : undefined;
    const delta = declaredOperatingResult === undefined ? 0 : operatingResult - declaredOperatingResult;

    periods.push({
      period,
      grossRevenue,
      discounts,
      netRevenue,
      variableCosts,
      payroll,
      fixedCosts,
      financialResult,
      operatingResult,
      netResult,
    });
    reconciliation.push({
      period,
      declaredOperatingResult,
      calculatedOperatingResult: operatingResult,
      delta,
      status:
        declaredOperatingResult === undefined
          ? "NOT_PROVIDED"
          : Math.abs(delta) <= CURRENCY_RECONCILIATION_TOLERANCE
            ? "PASS"
            : "FAIL",
    });
  }

  return {
    periods,
    rows: normalizedRows,
    unmappedRows: normalizedRows.filter((row) => row.status === "UNMAPPED"),
    reconciliation,
  };
}

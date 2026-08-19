import type { Calculation, CaseState, Claim, Evidence } from "../domain/schemas/case-state";

const evidence: Evidence[] = [
  { id: "ev-students-before", sourceType: "FILE", sourceFile: "turmas-sinteticas.csv", period: "2025-06", rawValue: 86, normalizedValue: 86, unit: "COUNT", confidence: 1 },
  { id: "ev-students-current", sourceType: "FILE", sourceFile: "turmas-sinteticas.csv", period: "2026-06", rawValue: 98, normalizedValue: 98, unit: "COUNT", confidence: 1 },
  { id: "ev-revenue-before", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2025-06", rawValue: 236_300, normalizedValue: 236_300, unit: "BRL", confidence: 1 },
  { id: "ev-revenue-current", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2026-06", rawValue: 250_000, normalizedValue: 250_000, unit: "BRL", confidence: 1 },
  { id: "ev-result-before", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2025-06", rawValue: 34_000, normalizedValue: 34_000, unit: "BRL", confidence: 1 },
  { id: "ev-result-current", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2026-06", rawValue: 14_250, normalizedValue: 14_250, unit: "BRL", confidence: 1 },
  { id: "ev-payroll-before", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2025-06", rawValue: 128_100, normalizedValue: 128_100, unit: "BRL", confidence: 1 },
  { id: "ev-payroll-current", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2026-06", rawValue: 154_500, normalizedValue: 154_500, unit: "BRL", confidence: 1 },
  { id: "ev-new-class-students", sourceType: "FILE", sourceFile: "turmas-sinteticas.csv", period: "2026-06", rawValue: 10, normalizedValue: 10, unit: "COUNT", confidence: 1 },
  { id: "ev-new-class-capacity", sourceType: "FILE", sourceFile: "turmas-sinteticas.csv", period: "2026-06", rawValue: 20, normalizedValue: 20, unit: "COUNT", confidence: 1 },
  { id: "ev-discount-before", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2025-06", rawValue: 0.08, normalizedValue: 0.08, unit: "PERCENT", confidence: 1 },
  { id: "ev-discount-current", sourceType: "FILE", sourceFile: "dre-sintetica.csv", period: "2026-06", rawValue: 0.16, normalizedValue: 0.16, unit: "PERCENT", confidence: 1 },
];

const calculations: Calculation[] = [
  { id: "calc-student-growth", formulaId: "student_growth", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-students-before", "ev-students-current"], rawResult: 0.1395348837, displayedResult: "+14,0%", unit: "PERCENT", status: "PASS" },
  { id: "calc-revenue-growth", formulaId: "net_revenue_growth", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-revenue-before", "ev-revenue-current"], rawResult: 0.0579767245, displayedResult: "+5,8%", unit: "PERCENT", status: "PASS" },
  { id: "calc-margin-before", formulaId: "operating_margin", formulaVersion: "1.0.0", period: "2025-06", inputRefs: ["ev-result-before", "ev-revenue-before"], rawResult: 0.1438840457, displayedResult: "14,4%", unit: "PERCENT", status: "PASS" },
  { id: "calc-margin-current", formulaId: "operating_margin", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-result-current", "ev-revenue-current"], rawResult: 0.057, displayedResult: "5,7%", unit: "PERCENT", status: "PASS" },
  { id: "calc-margin-change", formulaId: "operating_margin_change", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-result-before", "ev-revenue-before", "ev-result-current", "ev-revenue-current"], rawResult: -0.0868840457, displayedResult: "−8,7 p.p.", unit: "PERCENTAGE_POINT", status: "PASS" },
  { id: "calc-payroll-ratio-before", formulaId: "payroll_over_revenue", formulaVersion: "1.0.0", period: "2025-06", inputRefs: ["ev-payroll-before", "ev-revenue-before"], rawResult: 0.5421074905, displayedResult: "54,2%", unit: "PERCENT", status: "PASS" },
  { id: "calc-payroll-ratio-current", formulaId: "payroll_over_revenue", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-payroll-current", "ev-revenue-current"], rawResult: 0.618, displayedResult: "61,8%", unit: "PERCENT", status: "PASS" },
  { id: "calc-new-class-occupancy", formulaId: "class_occupancy", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-new-class-students", "ev-new-class-capacity"], rawResult: 0.5, displayedResult: "50,0%", unit: "PERCENT", status: "PASS" },
  { id: "calc-discount-change", formulaId: "discount_rate_change", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-discount-before", "ev-discount-current"], rawResult: 0.08, displayedResult: "+8,0 p.p.", unit: "PERCENTAGE_POINT", status: "PASS" },
  { id: "calc-bridge-volume", formulaId: "operating_result_bridge_volume", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-students-before", "ev-students-current"], rawResult: 28_600, displayedResult: "+ R$ 28,6 mil", unit: "BRL", status: "PASS" },
  { id: "calc-bridge-price", formulaId: "operating_result_bridge_price", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-revenue-before", "ev-revenue-current"], rawResult: 8_900, displayedResult: "+ R$ 8,9 mil", unit: "BRL", status: "PASS" },
  { id: "calc-bridge-discounts", formulaId: "operating_result_bridge_discounts", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-discount-before", "ev-discount-current"], rawResult: -23_500, displayedResult: "− R$ 23,5 mil", unit: "BRL", status: "PASS" },
  { id: "calc-bridge-payroll", formulaId: "operating_result_bridge_payroll", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-payroll-before", "ev-payroll-current"], rawResult: -24_800, displayedResult: "− R$ 24,8 mil", unit: "BRL", status: "PASS" },
  { id: "calc-bridge-fixed", formulaId: "operating_result_bridge_fixed_costs", formulaVersion: "1.0.0", period: "2026-06", inputRefs: ["ev-result-before", "ev-result-current"], rawResult: -4_600, displayedResult: "− R$ 4,6 mil", unit: "BRL", status: "PASS" },
];

const claims: Claim[] = [
  { id: "claim-growth-gap", statement: "Os alunos cresceram 14,0%, mas a receita líquida cresceu apenas 5,8%.", type: "CALCULATION", evidenceRefs: ["calc-student-growth", "calc-revenue-growth"], confidence: 1 },
  { id: "claim-margin", statement: "A margem operacional caiu de 14,4% para 5,7%, uma redução de 8,7 pontos percentuais.", type: "CALCULATION", evidenceRefs: ["calc-margin-before", "calc-margin-current", "calc-margin-change"], confidence: 1 },
  { id: "claim-payroll", statement: "A folha passou de 54,2% para 61,8% da receita líquida.", type: "CALCULATION", evidenceRefs: ["calc-payroll-ratio-before", "calc-payroll-ratio-current"], confidence: 1 },
  { id: "claim-class", statement: "A turma nova opera com 50,0% de ocupação, com 10 alunos em 20 vagas.", type: "CALCULATION", evidenceRefs: ["calc-new-class-occupancy"], confidence: 1 },
  { id: "claim-discount", statement: "A taxa de descontos aumentou 8,0 pontos percentuais no período.", type: "CALCULATION", evidenceRefs: ["calc-discount-change"], confidence: 1 },
  { id: "claim-diagnosis", statement: "A pressão sobre a margem está concentrada em descontos maiores, aumento de folha e baixa ocupação da turma nova.", type: "INFERENCE", evidenceRefs: ["calc-margin-change", "calc-payroll-ratio-current", "calc-discount-change", "calc-new-class-occupancy"], confidence: 0.9 },
];

function needsHiringContext(question: string): boolean {
  return /contrat|admit|demit|professor|funcion[aá]ri|equipe/u.test(question.toLocaleLowerCase("pt-BR"));
}

export function buildPublicCfoCaseState(question: string, previousQuestions: string[] = []): CaseState {
  const hiringQuestion = needsHiringContext(question);
  return {
    caseId: "public-demo-escola-horizonte",
    version: 1,
    business: { name: "Escola Horizonte", segment: "EARLY_CHILDHOOD_PRIVATE", city: "São Paulo", state: "SP", currency: "BRL" },
    user: { role: "OWNER", financialLiteracy: "MEDIUM", preferredDetail: "CONCISE", decisionAuthority: true },
    objective: { currentQuestion: question, decisionUnderAnalysis: hiringQuestion ? "avaliar contratação sem comprometer caixa e qualidade pedagógica" : "entender o desempenho financeiro e priorizar ações" },
    sources: {
      files: ["dre-sintetica.csv", "turmas-sinteticas.csv"],
      userStatements: [...previousQuestions.slice(-4), question].map((text, index) => ({ id: `public-turn-${index + 1}`, text, turn: index + 1 })),
      conflicts: [],
    },
    financial: { periods: [
      { period: "2025-06", grossRevenue: 256_848, discounts: 20_548, netRevenue: 236_300, variableCosts: 28_000, payroll: 128_100, fixedCosts: 46_200, financialResult: -2_000, operatingResult: 34_000, netResult: 32_000 },
      { period: "2026-06", grossRevenue: 290_000, discounts: 40_000, netRevenue: 250_000, variableCosts: 30_000, payroll: 154_500, fixedCosts: 51_250, financialResult: -2_500, operatingResult: 14_250, netResult: 11_750 },
    ] },
    operations: { periods: [
      { period: "2025-06", students: 86, classes: 5, capacity: 100, staff: 9 },
      { period: "2026-06", students: 98, classes: 6, capacity: 120, staff: 11 },
    ] },
    metrics: { values: [
      { id: "operating_margin", period: "2026-06", value: 0.057, status: "AVAILABLE", unit: "PERCENT", evidenceRefs: ["calc-margin-current"], calculationRef: "calc-margin-current" },
      { id: "payroll_over_revenue", period: "2026-06", value: 0.618, status: "AVAILABLE", unit: "PERCENT", evidenceRefs: ["calc-payroll-ratio-current"], calculationRef: "calc-payroll-ratio-current" },
      { id: "occupancy", period: "2026-06", value: 0.5, status: "AVAILABLE", unit: "PERCENT", evidenceRefs: ["calc-new-class-occupancy"], calculationRef: "calc-new-class-occupancy" },
      ...(hiringQuestion ? [{ id: "monthly_hire_cost", period: "2026-06", value: "UNKNOWN" as const, status: "UNKNOWN" as const, unit: "BRL" as const, evidenceRefs: [] }] : []),
    ] },
    reasoning: {
      facts: [],
      calculations: claims.filter((claim) => claim.type === "CALCULATION"),
      inferences: claims.filter((claim) => claim.type === "INFERENCE"),
      hypotheses: [{ id: "hypothesis-capacity", statement: "A ocupação pode crescer sem aumento adicional de quadro.", type: "HYPOTHESIS", evidenceRefs: ["calc-new-class-occupancy"], confidence: 0.7 }],
      recommendations: [{ id: "recommendation-priority", statement: "Priorizar a revisão de descontos e a ocupação da turma nova antes de reduzir a equipe.", type: "RECOMMENDATION", evidenceRefs: ["calc-discount-change", "calc-new-class-occupancy", "calc-payroll-ratio-current"], confidence: 0.88 }],
      unknowns: hiringQuestion ? [{ id: "unknown-hire-cost", statement: "O custo mensal integral da contratação é UNKNOWN.", type: "UNKNOWN", evidenceRefs: [], confidence: 1 }] : [],
    },
    evidence,
    calculations,
    quality: { reconciliation: "PASS", confidence: 0.9, warnings: ["Demonstração com dados 100% sintéticos; não representa uma escola real."] },
    conversation: { currentTurn: previousQuestions.length + 1, openQuestion: null, corrections: [] },
  };
}

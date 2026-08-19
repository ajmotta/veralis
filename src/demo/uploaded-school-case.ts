import type { Calculation, CaseState, Claim, Evidence, PeriodFinancials } from "../domain/schemas/case-state";

export type UploadedFinancialPeriod = {
  period: string;
  netRevenue: number;
  operatingResult: number;
  payroll?: number;
};

export type UploadedOperations = {
  students: number;
  capacity: number;
  classes: number;
  staff: number;
};

export type UploadedSchoolDocument = {
  name: string;
  businessName?: string;
  financialPeriods: UploadedFinancialPeriod[];
  operations?: UploadedOperations;
  warnings: string[];
};

const monthNumbers: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

function parseNumber(value: string): number | null {
  const clean = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!clean || clean === "-") return clean === "-" ? 0 : null;
  if (!/^-?[\d.,]+$/.test(clean)) return null;
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  let normalized = clean;
  if (lastComma > lastDot) normalized = clean.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && /\.\d{3}(?:\.|$)/.test(clean)) normalized = clean.replace(/\./g, "");
  else if (lastDot > lastComma && clean.split(".").length > 2) normalized = clean.replace(/\./g, "");
  const parsed = Number(normalized.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function periodFromLabel(value: string): string | null {
  const monthly = normalizeText(value).match(/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/(20\d{2})$/);
  if (monthly) return `${monthly[2]}-${monthNumbers[monthly[1]]}`;
  const quarterly = normalizeText(value).match(/^([1-4])t\/(20\d{2})$/);
  return quarterly ? `${quarterly[2]}-Q${quarterly[1]}` : null;
}

function businessNameFromFile(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return withoutExtension
    .replace(/\b(relatorio|gerencial|dre|trimestral|turmas|mensal|escola\d*)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || "Escola enviada";
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((value) => value.trim().replace(/^\uFEFF/, ""));
}

export function parseUploadedCsv(name: string, text: string): UploadedSchoolDocument {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const delimiter = (lines[0]?.match(/;/g)?.length ?? 0) >= (lines[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitDelimitedLine(lines[0] ?? "", delimiter).map(normalizeText);
  const rows = lines.slice(1).map((line) => splitDelimitedLine(line, delimiter));
  const warnings: string[] = [];
  const financialPeriods: UploadedFinancialPeriod[] = [];
  const studentIndex = headers.findIndex((header) => /matriculad|alunos|estudantes/.test(header));
  const capacityIndex = headers.findIndex((header) => /capacidade|vagas/.test(header));
  const teacherIndex = headers.findIndex((header) => /regentes|professores/.test(header));
  const assistantIndex = headers.findIndex((header) => /auxiliares/.test(header));
  let operations: UploadedOperations | undefined;

  if (studentIndex >= 0 && capacityIndex >= 0) {
    let students = 0; let capacity = 0; let staff = 0; let classes = 0;
    for (const row of rows) {
      const enrolled = parseNumber(row[studentIndex] ?? "");
      const seats = parseNumber(row[capacityIndex] ?? "");
      if (enrolled === null || seats === null || enrolled < 0 || seats <= 0 || enrolled > seats) {
        warnings.push(`Linha de turma inválida: ${row[0] || "sem identificação"}.`);
        continue;
      }
      students += enrolled; capacity += seats; classes += 1;
      staff += Math.max(0, parseNumber(row[teacherIndex] ?? "") ?? 0) + Math.max(0, parseNumber(row[assistantIndex] ?? "") ?? 0);
    }
    if (classes > 0) operations = { students, capacity, classes, staff };
  }

  const periodIndex = headers.findIndex((header) => /competencia|periodo|mes|trimestre/.test(header));
  const revenueIndex = headers.findIndex((header) => /receita liquida/.test(header));
  const resultIndex = headers.findIndex((header) => /resultado operacional|resultado do mes/.test(header));
  const payrollIndexes = headers.map((header, index) => /salarios|folha de pagamento|pessoal docente|pessoal administrativo|encargos/.test(header) ? index : -1).filter((index) => index >= 0);
  if (periodIndex >= 0 && revenueIndex >= 0 && resultIndex >= 0) {
    for (const row of rows) {
      const period = periodFromLabel(row[periodIndex] ?? "");
      const netRevenue = parseNumber(row[revenueIndex] ?? "");
      const operatingResult = parseNumber(row[resultIndex] ?? "");
      if (!period || netRevenue === null || operatingResult === null || netRevenue === 0) continue;
      const payroll = payrollIndexes.reduce((total, index) => total + Math.abs(parseNumber(row[index] ?? "") ?? 0), 0);
      financialPeriods.push({ period, netRevenue, operatingResult, ...(payroll > 0 ? { payroll } : {}) });
    }
  }

  if (!operations && financialPeriods.length === 0) warnings.push("Não reconheci colunas de turmas nem uma DRE tabular neste CSV.");
  return { name, businessName: businessNameFromFile(name), financialPeriods, operations, warnings };
}

function uniquePeriods(lines: string[]): string[] {
  const periods: string[] = [];
  for (const line of lines) {
    const period = periodFromLabel(line);
    if (period && !periods.includes(period)) periods.push(period);
  }
  return periods;
}

function numbersAfter(lines: string[], pattern: RegExp, count: number): number[] {
  const start = lines.findIndex((line) => pattern.test(normalizeText(line)));
  if (start < 0) return [];
  const values: number[] = [];
  for (let index = start + 1; index < lines.length && values.length < count; index += 1) {
    const value = parseNumber(lines[index]);
    if (value !== null) values.push(value);
  }
  return values;
}

function parseQuarterlyPdf(lines: string[], name: string, businessName: string): UploadedSchoolDocument | null {
  const periods = uniquePeriods(lines).filter((period) => period.includes("-Q"));
  if (periods.length < 2) return null;
  const revenues = numbersAfter(lines, /^receita liquida$/, periods.length);
  const results = numbersAfter(lines, /^resultado operacional$/, periods.length);
  const teaching = numbersAfter(lines, /^pessoal docente$/, periods.length);
  const admin = numbersAfter(lines, /^pessoal administrativo$/, periods.length);
  const charges = numbersAfter(lines, /^encargos e provisoes$/, periods.length);
  if (revenues.length !== periods.length || results.length !== periods.length) return null;
  const financialPeriods = periods.map((period, index) => ({
    period,
    netRevenue: revenues[index],
    operatingResult: results[index],
    ...((teaching[index] !== undefined || admin[index] !== undefined || charges[index] !== undefined)
      ? { payroll: Math.abs(teaching[index] ?? 0) + Math.abs(admin[index] ?? 0) + Math.abs(charges[index] ?? 0) }
      : {}),
  }));
  return { name, businessName, financialPeriods, warnings: [] };
}

function monthlyRows(lines: string[], startPattern: RegExp, endPattern: RegExp, valueCount: number): Map<string, number[]> {
  const normalized = lines.map(normalizeText);
  const start = normalized.findIndex((line) => startPattern.test(line));
  const endCandidate = normalized.findIndex((line, index) => index > start && endPattern.test(line));
  const end = endCandidate > start ? endCandidate : lines.length;
  const rows = new Map<string, number[]>();
  for (let index = Math.max(0, start); index < end; index += 1) {
    const period = periodFromLabel(lines[index]);
    if (!period || period.includes("-Q")) continue;
    const values: number[] = [];
    for (let cursor = index + 1; cursor < end && values.length < valueCount; cursor += 1) {
      if (periodFromLabel(lines[cursor])) break;
      const value = parseNumber(lines[cursor]);
      if (value !== null) values.push(value);
    }
    if (values.length === valueCount) rows.set(period, values);
  }
  return rows;
}

function parseMonthlyPdf(lines: string[], name: string, businessName: string): UploadedSchoolDocument | null {
  const revenueRows = monthlyRows(lines, /receitas e deducoes/, /despesas e resultado/, 11);
  const resultRows = monthlyRows(lines, /despesas e resultado/, /relatorio gerado/, 11);
  const financialPeriods: UploadedFinancialPeriod[] = [];
  for (const [period, revenueValues] of revenueRows) {
    const resultValues = resultRows.get(period);
    if (!resultValues) continue;
    const netRevenue = revenueValues[7];
    const operatingResult = resultValues[10];
    const payroll = Math.abs(revenueValues[8]) + Math.abs(revenueValues[9]) + Math.abs(revenueValues[10]);
    if (netRevenue !== 0) financialPeriods.push({ period, netRevenue, operatingResult, payroll });
  }
  return financialPeriods.length > 0 ? { name, businessName, financialPeriods, warnings: [] } : null;
}

export function parseUploadedPdfText(name: string, text: string): UploadedSchoolDocument {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const cnpjIndex = lines.findIndex((line) => /cnpj/i.test(line));
  const businessName = (cnpjIndex > 0 ? lines[cnpjIndex - 1] : lines[0]) || businessNameFromFile(name);
  const parsed = parseQuarterlyPdf(lines, name, businessName) ?? parseMonthlyPdf(lines, name, businessName);
  return parsed ?? { name, businessName, financialPeriods: [], warnings: ["O PDF foi lido, mas a tabela financeira não pôde ser normalizada com segurança."] };
}

function percent(value: number): string {
  return value.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function buildUploadedCfoCaseState(question: string, previousQuestions: string[], documents: UploadedSchoolDocument[]): CaseState {
  const businessName = documents.find((document) => document.businessName)?.businessName ?? "Escola enviada";
  const warnings = documents.flatMap((document) => document.warnings);
  const financialByPeriod = new Map<string, UploadedFinancialPeriod>();
  for (const document of documents) for (const period of document.financialPeriods) financialByPeriod.set(period.period, period);
  const selectedFinancial = [...financialByPeriod.values()].sort((a, b) => a.period.localeCompare(b.period)).slice(-2);
  const operations = documents.find((document) => document.operations)?.operations;
  const evidence: Evidence[] = [];
  const calculations: Calculation[] = [];
  const calculationClaims: Claim[] = [];
  const inferences: Claim[] = [];
  const metrics: CaseState["metrics"]["values"] = [];

  selectedFinancial.forEach((period, index) => {
    const suffix = index === selectedFinancial.length - 1 ? "current" : "previous";
    const revenueEvidence = `ev-upload-revenue-${suffix}`;
    const resultEvidence = `ev-upload-result-${suffix}`;
    evidence.push(
      { id: revenueEvidence, sourceType: "FILE", sourceFile: documents.find((document) => document.financialPeriods.some((item) => item.period === period.period))?.name, period: period.period, rawValue: period.netRevenue, normalizedValue: period.netRevenue, unit: "BRL", confidence: 0.95 },
      { id: resultEvidence, sourceType: "FILE", sourceFile: documents.find((document) => document.financialPeriods.some((item) => item.period === period.period))?.name, period: period.period, rawValue: period.operatingResult, normalizedValue: period.operatingResult, unit: "BRL", confidence: 0.95 },
    );
    const margin = period.operatingResult / period.netRevenue;
    const calculationId = `calc-upload-margin-${suffix}`;
    calculations.push({ id: calculationId, formulaId: "operating_margin", formulaVersion: "1.0.0", period: period.period, inputRefs: [resultEvidence, revenueEvidence], rawResult: margin, displayedResult: percent(margin), unit: "PERCENT", status: "PASS" });
    calculationClaims.push({ id: `claim-upload-margin-${suffix}`, statement: `A margem operacional em ${period.period} foi ${percent(margin)}, com receita líquida de ${money(period.netRevenue)} e resultado operacional de ${money(period.operatingResult)}.`, type: "CALCULATION", evidenceRefs: [calculationId], confidence: 0.95 });
    if (suffix === "current") metrics.push({ id: "operating_margin", period: period.period, value: margin, status: "AVAILABLE", unit: "PERCENT", evidenceRefs: [calculationId], calculationRef: calculationId });
    if (period.payroll && period.payroll > 0) {
      const payrollEvidence = `ev-upload-payroll-${suffix}`;
      const payrollCalculation = `calc-upload-payroll-${suffix}`;
      evidence.push({ id: payrollEvidence, sourceType: "FILE", sourceFile: documents.find((document) => document.financialPeriods.some((item) => item.period === period.period))?.name, period: period.period, rawValue: period.payroll, normalizedValue: period.payroll, unit: "BRL", confidence: 0.9 });
      calculations.push({ id: payrollCalculation, formulaId: "payroll_over_revenue", formulaVersion: "1.0.0", period: period.period, inputRefs: [payrollEvidence, revenueEvidence], rawResult: period.payroll / period.netRevenue, displayedResult: percent(period.payroll / period.netRevenue), unit: "PERCENT", status: "PASS" });
      calculationClaims.push({ id: `claim-upload-payroll-${suffix}`, statement: `A folha representa ${percent(period.payroll / period.netRevenue)} da receita líquida em ${period.period}.`, type: "CALCULATION", evidenceRefs: [payrollCalculation], confidence: 0.9 });
      if (suffix === "current") metrics.push({ id: "payroll_over_revenue", period: period.period, value: period.payroll / period.netRevenue, status: "AVAILABLE", unit: "PERCENT", evidenceRefs: [payrollCalculation], calculationRef: payrollCalculation });
    }
  });

  if (selectedFinancial.length === 2) {
    const before = selectedFinancial[0].operatingResult / selectedFinancial[0].netRevenue;
    const current = selectedFinancial[1].operatingResult / selectedFinancial[1].netRevenue;
    const change = current - before;
    const calculationId = "calc-upload-margin-change";
    calculations.push({ id: calculationId, formulaId: "operating_margin_change", formulaVersion: "1.0.0", period: selectedFinancial[1].period, inputRefs: ["calc-upload-margin-previous", "calc-upload-margin-current"], rawResult: change, displayedResult: `${change >= 0 ? "+" : ""}${(change * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`, unit: "PERCENTAGE_POINT", status: "PASS" });
    inferences.push({ id: "claim-upload-margin-change", statement: `A margem operacional ${change >= 0 ? "melhorou" : "piorou"} ${Math.abs(change * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pontos percentuais entre ${selectedFinancial[0].period} e ${selectedFinancial[1].period}.`, type: "INFERENCE", evidenceRefs: [calculationId], confidence: 0.95 });
  }

  let operationPeriod: CaseState["operations"]["periods"] = [];
  if (operations && operations.capacity > 0) {
    const studentEvidence = "ev-upload-students";
    const capacityEvidence = "ev-upload-capacity";
    const occupancyCalculation = "calc-upload-occupancy";
    evidence.push(
      { id: studentEvidence, sourceType: "FILE", sourceFile: documents.find((document) => document.operations)?.name, period: "atual", rawValue: operations.students, normalizedValue: operations.students, unit: "COUNT", confidence: 0.98 },
      { id: capacityEvidence, sourceType: "FILE", sourceFile: documents.find((document) => document.operations)?.name, period: "atual", rawValue: operations.capacity, normalizedValue: operations.capacity, unit: "COUNT", confidence: 0.98 },
    );
    calculations.push({ id: occupancyCalculation, formulaId: "class_occupancy", formulaVersion: "1.0.0", period: "atual", inputRefs: [studentEvidence, capacityEvidence], rawResult: operations.students / operations.capacity, displayedResult: percent(operations.students / operations.capacity), unit: "PERCENT", status: "PASS" });
    calculationClaims.push({ id: "claim-upload-occupancy", statement: `A ocupação consolidada das turmas válidas é ${percent(operations.students / operations.capacity)}, com ${operations.students} matrículas em ${operations.capacity} vagas.`, type: "CALCULATION", evidenceRefs: [occupancyCalculation], confidence: 0.98 });
    metrics.push({ id: "occupancy", period: "atual", value: operations.students / operations.capacity, status: "AVAILABLE", unit: "PERCENT", evidenceRefs: [occupancyCalculation], calculationRef: occupancyCalculation });
    operationPeriod = [{ period: "atual", students: operations.students, classes: operations.classes, capacity: operations.capacity, staff: operations.staff }];
  }

  const unknowns: Claim[] = [];
  if (selectedFinancial.length === 0) unknowns.push({ id: "unknown-upload-financial", statement: "Não foi possível normalizar receita líquida e resultado operacional dos arquivos enviados.", type: "UNKNOWN", evidenceRefs: [], confidence: 1 });
  if (!operations) unknowns.push({ id: "unknown-upload-operations", statement: "Não foi possível normalizar matrículas e capacidade das turmas dos arquivos enviados.", type: "UNKNOWN", evidenceRefs: [], confidence: 1 });
  const query = normalizeText(question);
  if (/folha|salario|pessoal/.test(query) && !metrics.some((metric) => metric.id === "payroll_over_revenue")) {
    metrics.push({ id: "payroll_over_revenue", period: "atual", value: "UNKNOWN", status: "UNKNOWN", unit: "PERCENT", evidenceRefs: [] });
    unknowns.unshift({ id: "unknown-upload-payroll", statement: "A folha total e a receita líquida comparável ainda não foram normalizadas para responder esta pergunta.", type: "UNKNOWN", evidenceRefs: [], confidence: 1 });
  }
  const financialPeriods: PeriodFinancials[] = selectedFinancial.map((period) => ({
    period: period.period, grossRevenue: period.netRevenue, discounts: 0, netRevenue: period.netRevenue,
    variableCosts: 0, payroll: period.payroll ?? 0, fixedCosts: 0, financialResult: 0,
    operatingResult: period.operatingResult, netResult: period.operatingResult,
  }));
  const lead = inferences[0] ?? calculationClaims[calculationClaims.length - 1];
  const hypotheses: Claim[] = lead ? [{ id: "hypothesis-upload-continuity", statement: "A leitura considera que os períodos e classificações dos arquivos são comparáveis.", type: "HYPOTHESIS", evidenceRefs: [...lead.evidenceRefs], confidence: 0.7 }] : [];
  const recommendations: Claim[] = lead ? [{ id: "recommendation-upload-review", statement: "Validar os lançamentos e as classificações dos arquivos antes de executar uma decisão irreversível.", type: "RECOMMENDATION", evidenceRefs: [...lead.evidenceRefs], confidence: 0.75 }] : [];

  return {
    caseId: "uploaded-school-session", version: 1,
    business: { name: businessName.slice(0, 120), segment: "EARLY_CHILDHOOD_PRIVATE", city: "São Paulo", state: "SP", currency: "BRL" },
    user: { role: "OWNER", financialLiteracy: "MEDIUM", preferredDetail: "CONCISE", decisionAuthority: true },
    objective: { currentQuestion: question, decisionUnderAnalysis: "avaliar os arquivos financeiros e operacionais enviados nesta sessão" },
    sources: { files: documents.map((document) => document.name), userStatements: [...previousQuestions.slice(-4), question].map((text, index) => ({ id: `uploaded-turn-${index + 1}`, text, turn: index + 1 })), conflicts: [] },
    financial: { periods: financialPeriods }, operations: { periods: operationPeriod }, metrics: { values: metrics },
    reasoning: { facts: [], calculations: calculationClaims, inferences, hypotheses, recommendations, unknowns },
    evidence, calculations,
    quality: { reconciliation: calculations.length > 0 ? "PASS" : "NOT_RUN", confidence: warnings.length > 0 ? 0.7 : calculations.length > 0 ? 0.9 : 0.3, warnings },
    conversation: { currentTurn: previousQuestions.length + 1, openQuestion: null, corrections: [] },
  };
}

import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { calculateP0Metrics } from "../src/domain/calculations/metrics.ts";
import { buildPerformanceBridge } from "../src/domain/reconciliation/performance-bridge.ts";
import type { FinancialPeriodInput } from "../src/domain/schemas/financial.ts";

export interface DemoClass {
  classId: string;
  label: string;
  shift: "MANHA" | "TARDE";
  capacity: number;
  opensIn: string;
}

export interface DemoStaffMember {
  staffId: string;
  role: "TEACHER" | "ASSISTANT" | "COORDINATOR" | "ADMIN";
  classId: string | null;
  baseMonthlyCost2025: number;
  startsIn: string;
}

interface MonthlyAssumptions {
  period: string;
  listPrice: number;
  discountRate: number;
  otherRevenue: number;
  variableCostPerStudent: number;
  paymentProcessingRate: number;
  fixedOperatingCosts: number;
  financialResult: number;
  openReceivablesRate: number;
  writeOffRate: number;
  enrollmentByClass: Record<string, number>;
}

export interface DemoSourceOfTruth {
  business: {
    name: "Escola Horizonte";
    city: "São Paulo";
    state: "SP";
    segment: "EARLY_CHILDHOOD_PRIVATE";
    synthetic: true;
  };
  classes: DemoClass[];
  staff: DemoStaffMember[];
  months: MonthlyAssumptions[];
}

const classes: DemoClass[] = [
  { classId: "T01", label: "Grupo 1 manhã", shift: "MANHA", capacity: 20, opensIn: "2025-01" },
  { classId: "T02", label: "Grupo 2 manhã", shift: "MANHA", capacity: 20, opensIn: "2025-01" },
  { classId: "T03", label: "Grupo 3 manhã", shift: "MANHA", capacity: 20, opensIn: "2025-01" },
  { classId: "T04", label: "Grupo 4 tarde", shift: "TARDE", capacity: 20, opensIn: "2025-01" },
  { classId: "T05", label: "Grupo 5 tarde", shift: "TARDE", capacity: 20, opensIn: "2025-01" },
  { classId: "T06", label: "Grupo 6 tarde", shift: "TARDE", capacity: 20, opensIn: "2026-03" },
];

const staff: DemoStaffMember[] = [
  { staffId: "P001", role: "TEACHER", classId: "T01", baseMonthlyCost2025: 12_000, startsIn: "2025-01" },
  { staffId: "P002", role: "TEACHER", classId: "T02", baseMonthlyCost2025: 12_000, startsIn: "2025-01" },
  { staffId: "P003", role: "TEACHER", classId: "T03", baseMonthlyCost2025: 12_000, startsIn: "2025-01" },
  { staffId: "P004", role: "TEACHER", classId: "T04", baseMonthlyCost2025: 12_000, startsIn: "2025-01" },
  { staffId: "P005", role: "ASSISTANT", classId: "T01", baseMonthlyCost2025: 7_000, startsIn: "2025-01" },
  { staffId: "P006", role: "ASSISTANT", classId: "T03", baseMonthlyCost2025: 7_000, startsIn: "2025-01" },
  { staffId: "P007", role: "ASSISTANT", classId: "T05", baseMonthlyCost2025: 7_000, startsIn: "2025-01" },
  { staffId: "P008", role: "COORDINATOR", classId: null, baseMonthlyCost2025: 14_000, startsIn: "2025-01" },
  { staffId: "P009", role: "ADMIN", classId: null, baseMonthlyCost2025: 10_000, startsIn: "2025-01" },
  { staffId: "P010", role: "TEACHER", classId: "T06", baseMonthlyCost2025: 12_000, startsIn: "2026-03" },
  { staffId: "P011", role: "ASSISTANT", classId: "T06", baseMonthlyCost2025: 7_000, startsIn: "2026-03" },
];

const month = (
  period: string,
  enrollment: number[],
  overrides: Partial<Omit<MonthlyAssumptions, "period" | "enrollmentByClass">> = {},
): MonthlyAssumptions => ({
  period,
  listPrice: period.startsWith("2026") ? 2_650 : 2_500,
  discountRate: period.startsWith("2026") ? 0.12 : 0.08,
  otherRevenue: 6_000,
  variableCostPerStudent: period.startsWith("2026") ? 190 : 170,
  paymentProcessingRate: period.startsWith("2026") ? 0.019 : 0.018,
  fixedOperatingCosts: period >= "2026-03" ? 43_900 : period.startsWith("2026") ? 39_400 : 37_000,
  financialResult: period.startsWith("2026") ? -3_000 : -2_000,
  openReceivablesRate: period.startsWith("2026") ? 0.07 : 0.05,
  writeOffRate: period.startsWith("2026") ? 0.008 : 0.006,
  enrollmentByClass: Object.fromEntries(classes.map((item, index) => [item.classId, enrollment[index] ?? 0])),
  ...overrides,
});

export const DEMO_SOURCE_OF_TRUTH: DemoSourceOfTruth = {
  business: {
    name: "Escola Horizonte",
    city: "São Paulo",
    state: "SP",
    segment: "EARLY_CHILDHOOD_PRIVATE",
    synthetic: true,
  },
  classes,
  staff,
  months: [
    month("2025-01", [16, 15, 16, 16, 15], { discountRate: 0.075 }),
    month("2025-02", [16, 16, 16, 16, 16], { discountRate: 0.078 }),
    month("2025-03", [17, 16, 16, 17, 16], { discountRate: 0.08 }),
    month("2025-04", [17, 16, 17, 17, 16], { discountRate: 0.082 }),
    month("2025-05", [17, 17, 17, 17, 16], { discountRate: 0.085 }),
    month("2025-06", [17, 17, 17, 17, 17], { discountRate: 0.088 }),
    month("2025-07", [18, 17, 17, 17, 17], { discountRate: 0.09 }),
    month("2026-01", [18, 17, 18, 17, 18], { discountRate: 0.11, otherRevenue: 55_000 }),
    month("2026-02", [18, 18, 18, 17, 18], { discountRate: 0.12 }),
    month("2026-03", [18, 17, 17, 17, 17, 5], { discountRate: 0.13 }),
    month("2026-04", [18, 17, 17, 17, 16, 7], { discountRate: 0.14 }),
    month("2026-05", [18, 17, 17, 17, 16, 8], { discountRate: 0.145 }),
    month("2026-06", [18, 18, 17, 17, 16, 9], { discountRate: 0.15 }),
    month("2026-07", [18, 18, 17, 17, 16, 10], { discountRate: 0.16 }),
  ],
};

function isActive(startPeriod: string, period: string): boolean {
  return startPeriod <= period;
}

function staffCost(member: DemoStaffMember, period: string): number {
  return member.baseMonthlyCost2025 * (period.startsWith("2026") ? 1.05 : 1);
}

export function deriveDemoPeriods(source = DEMO_SOURCE_OF_TRUTH): FinancialPeriodInput[] {
  return source.months.map((assumption) => {
    const activeClasses = source.classes.filter((item) => isActive(item.opensIn, assumption.period));
    const students = Object.values(assumption.enrollmentByClass).reduce((sum, value) => sum + value, 0);
    const capacity = activeClasses.reduce((sum, item) => sum + item.capacity, 0);
    const activeStaff = source.staff.filter((member) => isActive(member.startsIn, assumption.period));
    const payroll = activeStaff.reduce((sum, member) => sum + staffCost(member, assumption.period), 0);
    const grossTuitionRevenue = students * assumption.listPrice;
    const discounts = grossTuitionRevenue * assumption.discountRate;
    const grossRevenue = grossTuitionRevenue + assumption.otherRevenue;
    const netRevenue = grossRevenue - discounts;
    const variableCosts =
      students * assumption.variableCostPerStudent + netRevenue * assumption.paymentProcessingRate;
    const operatingResult = netRevenue - variableCosts - payroll - assumption.fixedOperatingCosts;
    const netResult = operatingResult + assumption.financialResult;

    return {
      period: assumption.period,
      grossRevenue,
      grossTuitionRevenue,
      otherRevenue: assumption.otherRevenue,
      discounts,
      netRevenue,
      variableCosts,
      payroll,
      fixedCosts: assumption.fixedOperatingCosts,
      financialResult: assumption.financialResult,
      operatingResult,
      netResult,
      students,
      classes: activeClasses.length,
      capacity,
      staff: activeStaff.length,
      openReceivables: netRevenue * assumption.openReceivablesRate,
      writeOffs: netRevenue * assumption.writeOffRate,
    };
  });
}

function csv(rows: Array<Array<string | number>>): string {
  return `${rows
    .map((row) =>
      row
        .map((value) => {
          const stringValue = String(value);
          return /[",\r\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
        })
        .join(","),
    )
    .join("\n")}\n`;
}

async function writeCsvFixtures(outputDir: string, source: DemoSourceOfTruth, periods: FinancialPeriodInput[]) {
  const classRows: Array<Array<string | number>> = [[
    "period",
    "class_id",
    "class_label",
    "shift",
    "capacity",
    "enrolled_students",
    "occupancy_rate",
  ]];
  const enrollmentRows: Array<Array<string | number>> = [[
    "period",
    "class_id",
    "enrolled_students",
    "new_enrollments",
    "withdrawals",
  ]];
  const staffRows: Array<Array<string | number>> = [[
    "period",
    "staff_id",
    "role",
    "class_id",
    "monthly_fully_loaded_cost",
  ]];
  const receiptRows: Array<Array<string | number>> = [[
    "period",
    "billed_amount",
    "cash_received",
    "open_receivables",
    "write_offs",
  ]];

  for (let monthIndex = 0; monthIndex < source.months.length; monthIndex += 1) {
    const assumption = source.months[monthIndex];
    for (const item of source.classes.filter((entry) => isActive(entry.opensIn, assumption.period))) {
      const enrolled = assumption.enrollmentByClass[item.classId] ?? 0;
      classRows.push([
        assumption.period,
        item.classId,
        item.label,
        item.shift,
        item.capacity,
        enrolled,
        enrolled / item.capacity,
      ]);
      const previous = source.months[monthIndex - 1];
      const priorEnrollment = previous?.enrollmentByClass[item.classId] ?? 0;
      enrollmentRows.push([
        assumption.period,
        item.classId,
        enrolled,
        Math.max(0, enrolled - priorEnrollment),
        Math.max(0, priorEnrollment - enrolled),
      ]);
    }
    for (const member of source.staff.filter((entry) => isActive(entry.startsIn, assumption.period))) {
      staffRows.push([
        assumption.period,
        member.staffId,
        member.role,
        member.classId ?? "SHARED",
        staffCost(member, assumption.period),
      ]);
    }
    const financials = periods.find((entry) => entry.period === assumption.period)!;
    const openReceivables = financials.openReceivables ?? 0;
    const writeOffs = financials.writeOffs ?? 0;
    receiptRows.push([
      assumption.period,
      financials.netRevenue,
      financials.netRevenue - openReceivables - writeOffs,
      openReceivables,
      writeOffs,
    ]);
  }

  await Promise.all([
    fs.writeFile(path.join(outputDir, "turmas.csv"), csv(classRows), "utf8"),
    fs.writeFile(path.join(outputDir, "matriculas.csv"), csv(enrollmentRows), "utf8"),
    fs.writeFile(path.join(outputDir, "equipe.csv"), csv(staffRows), "utf8"),
    fs.writeFile(path.join(outputDir, "recebimentos.csv"), csv(receiptRows), "utf8"),
  ]);
}

// The optional artifact runtime is resolved outside this package and does not
// expose compile-time types to the application workspace.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadArtifactTool(anchor?: string): Promise<any> {
  if (anchor) {
    const requireFromAnchor = createRequire(path.resolve(anchor));
    const entry = requireFromAnchor.resolve("@oai/artifact-tool");
    return import(pathToFileURL(entry).href);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
  return dynamicImport("@oai/artifact-tool");
}

async function writeWorkbook(
  outputDir: string,
  source: DemoSourceOfTruth,
  periods: FinancialPeriodInput[],
  artifactToolAnchor?: string,
) {
  const { SpreadsheetFile, Workbook } = await loadArtifactTool(artifactToolAnchor);
  const workbook = Workbook.create();
  const drivers = workbook.worksheets.add("Drivers");
  const dre = workbook.worksheets.add("DRE Mensal");
  const checks = workbook.worksheets.add("Checks");
  workbook.comments.setSelf({ displayName: "Veralis" });

  const columns = periods.length + 1;
  const endColumn = String.fromCharCode(64 + columns);
  const periodHeaders = periods.map((entry) => entry.period);
  drivers.getRange(`A1:${endColumn}1`).values = [["Driver", ...periodHeaders]];
  drivers.getRange(`A2:${endColumn}13`).values = [
    ["Alunos", ...periods.map((entry) => entry.students)],
    ["Capacidade", ...periods.map((entry) => entry.capacity)],
    ["Turmas", ...periods.map((entry) => entry.classes)],
    ["Equipe", ...periods.map((entry) => entry.staff)],
    ["Mensalidade de tabela", ...source.months.map((entry) => entry.listPrice)],
    ["Receita bruta mensalidades", ...periods.map((entry) => entry.grossTuitionRevenue ?? 0)],
    ["Taxa de descontos", ...source.months.map((entry) => entry.discountRate)],
    ["Receitas acessórias", ...periods.map((entry) => entry.otherRevenue ?? 0)],
    ["Custos variáveis", ...periods.map((entry) => entry.variableCosts)],
    ["Pessoal e encargos", ...periods.map((entry) => entry.payroll)],
    ["Despesas operacionais fixas", ...periods.map((entry) => entry.fixedCosts)],
    ["Resultado financeiro", ...periods.map((entry) => entry.financialResult)],
  ];
  drivers.getRange(`B7:${endColumn}7`).formulas = [periods.map((_, index) => {
    const column = String.fromCharCode(66 + index);
    return `=${column}2*${column}6`;
  })];
  drivers.getRange(`B8:${endColumn}8`).format.numberFormat = "0.0%";
  drivers.getRange(`B2:${endColumn}5`).format.numberFormat = "#,##0";
  drivers.getRange(`B6:${endColumn}7`).format.numberFormat = 'R$ #,##0.00;[Red](R$ #,##0.00);-';
  drivers.getRange(`B9:${endColumn}13`).format.numberFormat = 'R$ #,##0.00;[Red](R$ #,##0.00);-';
  drivers.getRange(`A1:${endColumn}1`).format = {
    fill: "#25224A",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
  };
  drivers.getRange("A1:A13").format.font = { bold: true, color: "#25224A" };
  drivers.getRange(`A1:${endColumn}13`).format.borders = {
    insideHorizontal: { style: "thin", color: "#DDE0EA" },
    bottom: { style: "thin", color: "#DDE0EA" },
  };
  drivers.freezePanes.freezeRows(1);
  drivers.freezePanes.freezeColumns(1);
  drivers.showGridLines = false;
  drivers.getRange("A1:A13").format.columnWidth = 31;
  drivers.getRange(`B1:${endColumn}13`).format.columnWidth = 13;

  dre.getRange(`A1:${endColumn}1`).merge();
  dre.getRange("A1").values = [["Escola Horizonte — DRE mensal sintética"]];
  dre.getRange(`A1:${endColumn}1`).format = {
    fill: "#08080D",
    font: { bold: true, color: "#FFFFFF", size: 16 },
    rowHeight: 28,
  };
  dre.getRange(`A3:${endColumn}3`).values = [["Conta", ...periodHeaders]];
  dre.getRange("A4:A15").values = [
    ["Receita de mensalidades bruta"],
    ["Receitas acessórias"],
    ["Receita bruta total"],
    ["Descontos e bolsas"],
    ["Receita líquida"],
    ["Custos variáveis"],
    ["Margem de contribuição"],
    ["Pessoal e encargos"],
    ["Despesas operacionais fixas"],
    ["Resultado operacional"],
    ["Resultado financeiro"],
    ["Resultado líquido"],
  ];
  for (let index = 0; index < periods.length; index += 1) {
    const column = String.fromCharCode(66 + index);
    dre.getRange(`${column}4:${column}15`).formulas = [
      [`='Drivers'!${column}7`],
      [`='Drivers'!${column}9`],
      [`=SUM(${column}4:${column}5)`],
      [`=-'Drivers'!${column}7*'Drivers'!${column}8`],
      [`=SUM(${column}6:${column}7)`],
      [`=-'Drivers'!${column}10`],
      [`=SUM(${column}8:${column}9)`],
      [`=-'Drivers'!${column}11`],
      [`=-'Drivers'!${column}12`],
      [`=SUM(${column}10:${column}12)`],
      [`='Drivers'!${column}13`],
      [`=SUM(${column}13:${column}14)`],
    ];
  }
  dre.getRange(`A3:${endColumn}3`).format = {
    fill: "#8D86FF",
    font: { bold: true, color: "#08080D" },
    horizontalAlignment: "center",
  };
  dre.getRange(`B4:${endColumn}15`).format.numberFormat = 'R$ #,##0.00;[Red](R$ #,##0.00);-';
  for (const row of [6, 8, 10, 13, 15]) {
    dre.getRange(`A${row}:${endColumn}${row}`).format = {
      font: { bold: true },
      borders: { top: { style: "thin", color: "#25224A" } },
    };
  }
  dre.getRange(`A3:${endColumn}15`).format.borders = {
    insideHorizontal: { style: "thin", color: "#E5E7EF" },
  };
  dre.freezePanes.freezeRows(3);
  dre.freezePanes.freezeColumns(1);
  dre.showGridLines = false;
  dre.getRange("A1:A15").format.columnWidth = 34;
  dre.getRange(`B1:${endColumn}15`).format.columnWidth = 13;
  workbook.comments.addThread(
    { cell: dre.getRange("A1") },
    "Fonte: fixture sintética Escola Horizonte. Todas as saídas derivam do source of truth no gerador.",
  );

  checks.getRange("A1:F1").merge();
  checks.getRange("A1").values = [["Checks de reconciliação"]];
  checks.getRange("A1:F1").format = {
    fill: "#08080D",
    font: { bold: true, color: "#FFFFFF", size: 15 },
  };
  checks.getRange("A3:F3").values = [["Período", "DRE", "Esperado", "Diferença", "Tolerância", "Status"]];
  checks.getRange("A3:F3").format = { fill: "#42D9E8", font: { bold: true, color: "#08080D" } };
  for (let index = 0; index < periods.length; index += 1) {
    const row = index + 4;
    const sourceColumn = String.fromCharCode(66 + index);
    checks.getRange(`A${row}:F${row}`).values = [[periods[index].period, null, periods[index].netResult, null, 0.02, null]];
    checks.getRange(`B${row}`).formulas = [[`='DRE Mensal'!${sourceColumn}15`]];
    checks.getRange(`D${row}`).formulas = [[`=B${row}-C${row}`]];
    checks.getRange(`F${row}`).formulas = [[`=IF(ABS(D${row})<=E${row},"OK","FAIL")`]];
  }
  const lastCheckRow = periods.length + 3;
  checks.getRange("A2:B2").values = [["MODEL STATUS", null]];
  checks.getRange("B2").formulas = [[`=IF(COUNTIF(F4:F${lastCheckRow},"FAIL")=0,"PASS","FAIL")`]];
  checks.getRange(`B4:E${lastCheckRow}`).format.numberFormat = 'R$ #,##0.00;[Red](R$ #,##0.00);-';
  checks.getRange(`A2:B2`).format = { fill: "#DDF8EC", font: { bold: true, color: "#11543D" } };
  checks.getRange(`A3:F${lastCheckRow}`).format.borders = {
    insideHorizontal: { style: "thin", color: "#DDE0EA" },
    bottom: { style: "thin", color: "#DDE0EA" },
  };
  checks.getRange(`A1:A${lastCheckRow}`).format.columnWidth = 14;
  checks.getRange(`B1:F${lastCheckRow}`).format.columnWidth = 18;
  checks.showGridLines = false;

  const workbookPath = path.join(outputDir, "dre_mensal.xlsx");
  const blob = await SpreadsheetFile.exportXlsx(workbook);
  await blob.save(workbookPath);

  const inspection = await workbook.inspect({
    kind: "table",
    range: `DRE Mensal!A3:${endColumn}15`,
    include: "values,formulas",
    tableMaxRows: 15,
    tableMaxCols: columns,
    maxChars: 8_000,
  });
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "final formula error scan",
  });
  const preview = await workbook.render({ sheetName: "DRE Mensal", range: `A1:${endColumn}15`, scale: 1.4 });
  await fs.writeFile(path.join(outputDir, ".dre-preview.png"), new Uint8Array(await preview.arrayBuffer()));
  return { workbookPath, inspection: inspection.ndjson, errors: errors.ndjson };
}

export async function generateDemoFixture(options: { outputDir: string; artifactToolAnchor?: string }) {
  const source = DEMO_SOURCE_OF_TRUTH;
  const periods = deriveDemoPeriods(source);
  const previous = periods.find((entry) => entry.period === "2025-07")!;
  const current = periods.find((entry) => entry.period === "2026-07")!;
  const metrics = calculateP0Metrics(current, previous);
  const bridge = buildPerformanceBridge(previous, current);
  const newClass = source.classes.find((entry) => entry.classId === "T06")!;
  const currentAssumptions = source.months.find((entry) => entry.period === "2026-07")!;

  await fs.mkdir(options.outputDir, { recursive: true });
  await writeCsvFixtures(options.outputDir, source, periods);
  const workbook = await writeWorkbook(options.outputDir, source, periods, options.artifactToolAnchor);
  const groundTruth = {
    fixture: "veralis-demo",
    runtimeImportForbidden: true,
    business: source.business,
    comparison: { periodA: previous.period, periodB: current.period, kind: "PRIOR_YEAR_MONTH" },
    metrics: Object.fromEntries(metrics.map((metric) => [metric.id, metric])),
    bridge,
    storyChecks: {
      studentsGrew: current.students > previous.students,
      revenueGrew: current.netRevenue > previous.netRevenue,
      revenuePerStudentFell: current.netRevenue / current.students < previous.netRevenue / previous.students,
      discountsIncreased: current.discounts / current.grossRevenue > previous.discounts / previous.grossRevenue,
      payrollIncreased: current.payroll > previous.payroll,
      newClassLowOccupancy:
        (currentAssumptions.enrollmentByClass[newClass.classId] ?? 0) / newClass.capacity < 0.6,
      operatingMarginFell:
        current.operatingResult / current.netRevenue < previous.operatingResult / previous.netRevenue,
      extraordinaryMonth: "2026-01",
      extraordinaryOtherRevenue: source.months.find((entry) => entry.period === "2026-01")!.otherRevenue,
    },
    periods,
  };
  await fs.writeFile(path.join(options.outputDir, "ground_truth.json"), `${JSON.stringify(groundTruth, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(options.outputDir, "README.md"),
    `# Escola Horizonte — fixture pública\n\nDataset 100% sintético de uma escola privada de Educação Infantil em São Paulo/SP. Não contém nomes, dados de crianças ou qualquer PII real.\n\n## História verificável\n\nEntre julho de 2025 e julho de 2026, alunos e receita líquida crescem, mas a receita por aluno e a margem operacional caem. Descontos maiores, duas contratações e uma nova turma vespertina com 50% de ocupação explicam a pressão. Uma receita extraordinária em janeiro de 2026 mascara parte da deterioração no acumulado.\n\n## Arquivos\n\n- \`dre_mensal.xlsx\`: DRE mensal com fórmulas e checks.\n- \`turmas.csv\`: capacidade e ocupação por turma/mês.\n- \`matriculas.csv\`: contagens agregadas, sem dados pessoais.\n- \`equipe.csv\`: IDs sintéticos, funções e custo mensal.\n- \`recebimentos.csv\`: faturado, recebido, saldo aberto e baixa efetiva separados.\n- \`ground_truth.json\`: somente testes/evals; proibido no runtime.\n\nRegeneração: \`npm run fixture:generate\`. O XLSX requer o runtime bundlado do Codex com \`@oai/artifact-tool\`; passe \`--artifact-tool-anchor=<arquivo dentro do diretório que resolve o pacote>\` quando ele não estiver instalado no projeto.\n`,
    "utf8",
  );
  return workbook;
}

function cliArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const executedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (executedDirectly) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outputDir = cliArgument("output-dir") ?? path.join(repositoryRoot, "fixtures", "public", "veralis-demo");
  const result = await generateDemoFixture({
    outputDir,
    artifactToolAnchor: cliArgument("artifact-tool-anchor") ?? process.env.VERALIS_ARTIFACT_TOOL_ANCHOR,
  });
  console.log(`Generated ${result.workbookPath}`);
  console.log(result.errors);
}

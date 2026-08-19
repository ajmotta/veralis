import assert from "node:assert/strict";
import test from "node:test";
import { buildUploadedCfoCaseState, parseUploadedCsv, parseUploadedPdfText } from "../../src/demo/uploaded-school-case.ts";

test("normalizes a multi-class semicolon CSV and rejects impossible enrollment", () => {
  const document = parseUploadedCsv("Escola_Semear_turmas.csv", [
    "turma;matriculados;capacidade;regentes;auxiliares",
    "Infantil A;14;20;1;1",
    "Infantil B;9;20;1;1",
    "Linha inválida;-4;25;1;0",
  ].join("\n"));
  assert.deepEqual(document.operations, { students: 23, capacity: 40, classes: 2, staff: 4 });
  assert.equal(document.warnings.length, 1);
});

test("normalizes a quarterly financial PDF text and builds a non-demo case", () => {
  const document = parseUploadedPdfText("Semear_DRE.pdf", [
    "COLÉGIO SEMEAR S/S LTDA", "CNPJ 00.000.000/0001-00", "Conta",
    "1T/2026", "2T/2026",
    "RECEITA LÍQUIDA", "967.223,83", "972.759,49",
    "Pessoal docente", "-287.432,96", "-290.662,24",
    "Pessoal administrativo", "-105.623,29", "-106.108,82",
    "Encargos e provisões", "-149.361,38", "-150.773,00",
    "RESULTADO OPERACIONAL", "30.883,17", "116.448,86",
  ].join("\n"));
  assert.equal(document.financialPeriods.length, 2);
  const caseState = buildUploadedCfoCaseState("Como está minha escola?", [], [document]);
  assert.equal(caseState.caseId, "uploaded-school-session");
  assert.equal(caseState.business.name, "COLÉGIO SEMEAR S/S LTDA");
  assert.equal(caseState.financial.periods[1].netRevenue, 972_759.49);
  assert.ok(caseState.calculations.some((calculation) => calculation.formulaId === "operating_margin_change"));
  assert.ok(caseState.reasoning.inferences[0].statement.includes("melhorou"));
  const payrollCase = buildUploadedCfoCaseState("Minha folha está alta?", [], [document]);
  assert.ok(payrollCase.reasoning.calculations.some((claim) => /folha representa/i.test(claim.statement)));
});

test("asks for payroll data instead of repeating occupancy when only classes were uploaded", () => {
  const operations = parseUploadedCsv("Semear_turmas.csv", "turma;matriculados;capacidade\nInfantil A;14;20\nInfantil B;9;20");
  const caseState = buildUploadedCfoCaseState("Minha folha está alta?", [], [operations]);
  assert.equal(caseState.metrics.values.find((metric) => metric.id === "payroll_over_revenue")?.status, "UNKNOWN");
  assert.equal(caseState.quality.reconciliation, "PASS");
});

test("identifies the principal cost line from a monthly management report", () => {
  const document = parseUploadedPdfText("Girassol_Relatorio.pdf", [
    "ESPAÇO GIRASSOL EDUCAÇÃO INFANTIL LTDA", "CNPJ 00.000.000/0001-00",
    "Receitas e deduções", "jul/2026",
    "260.922", "0", "21.350", "14.689", "3.733", "39.037", "24.657", "237.000", "107.961", "0", "41.025",
    "Despesas e resultado", "jul/2026",
    "28.000", "9.706", "2.414", "9.695", "3.057", "12.245", "6.494", "13.619", "1.624", "235.839", "1.161",
    "Relatório gerado",
  ].join("\n"));
  const caseState = buildUploadedCfoCaseState("qual minha principal linha de custo?", [], [document]);
  assert.ok(caseState.reasoning.calculations.some((claim) => /principal linha de custo.*folha e encargos/i.test(claim.statement)));
  assert.equal(caseState.metrics.values.find((metric) => metric.id === "principal_cost_line")?.status, "AVAILABLE");
});

test("asks for cost detail instead of answering with occupancy when only classes were uploaded", () => {
  const operations = parseUploadedCsv("Girassol_turmas.csv", "turma;matriculados;capacidade\nInfantil A;14;20\nInfantil B;9;20");
  const caseState = buildUploadedCfoCaseState("qual minha principal linha de custo?", [], [operations]);
  assert.equal(caseState.metrics.values.find((metric) => metric.id === "principal_cost_line")?.status, "UNKNOWN");
});

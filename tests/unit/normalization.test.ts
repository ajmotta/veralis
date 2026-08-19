import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFinancialRows } from "../../src/domain/normalize/financial.ts";

test("normalizes aliases, preserves unmapped rows, and reconciles a DRE", () => {
  const dataset = normalizeFinancialRows([
    { label: "Receita escolar", period: "2026-07", value: 260_000, sourceFile: "dre.xlsx", row: 4 },
    { label: "Descontos e bolsas", period: "2026-07", value: -40_000, sourceFile: "dre.xlsx", row: 5 },
    { label: "Custos variáveis", period: "2026-07", value: -20_000, sourceFile: "dre.xlsx", row: 6 },
    { label: "Pessoal e encargos", period: "2026-07", value: -110_000, sourceFile: "dre.xlsx", row: 7 },
    { label: "Custos fixos", period: "2026-07", value: -45_000, sourceFile: "dre.xlsx", row: 8 },
    { label: "Resultado operacional", period: "2026-07", value: 45_000, sourceFile: "dre.xlsx", row: 9 },
    { label: "Observação da direção", period: "2026-07", value: 123, sourceFile: "dre.xlsx", row: 10 },
  ]);

  assert.equal(dataset.periods[0].netRevenue, 220_000);
  assert.equal(dataset.periods[0].operatingResult, 45_000);
  assert.equal(dataset.reconciliation[0].status, "PASS");
  assert.equal(dataset.unmappedRows.length, 1);
  assert.equal(dataset.unmappedRows[0].canonicalAccount, "UNMAPPED");
  assert.equal(dataset.unmappedRows[0].evidence.rawValue, 123);
});

test("does not hide a failed reconciliation", () => {
  const dataset = normalizeFinancialRows([
    { label: "Mensalidades", period: "2026-01", value: 100, sourceFile: "dre.xlsx" },
    { label: "Resultado operacional", period: "2026-01", value: 99, sourceFile: "dre.xlsx" },
  ]);
  assert.equal(dataset.reconciliation[0].status, "FAIL");
  assert.equal(dataset.reconciliation[0].delta, 1);
});

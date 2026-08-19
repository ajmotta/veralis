import assert from "node:assert/strict";
import test from "node:test";

import { isCfoConversationInScope, isCfoQuestionInScope } from "../../src/ai/scope.ts";

test("accepts school CFO questions", () => {
  assert.equal(isCfoQuestionInScope("Por que a margem da escola caiu?"), true);
  assert.equal(isCfoQuestionInScope("Posso contratar outra professora para a turma?"), true);
});

test("rejects general-purpose and oversized prompts", () => {
  assert.equal(isCfoQuestionInScope("Escreva uma receita de bolo"), false);
  assert.equal(isCfoQuestionInScope("x".repeat(801)), false);
});

test("allows short follow-ups only after an in-scope CFO question", () => {
  assert.equal(isCfoConversationInScope("mais detalhes", ["Por que a margem da escola caiu?"]), true);
  assert.equal(isCfoConversationInScope("e agora?", ["Posso contratar outra professora para a turma?"]), true);
  assert.equal(isCfoConversationInScope("mais detalhes", []), false);
  assert.equal(isCfoConversationInScope("Escreva uma receita de bolo", ["Por que a margem caiu?"]), false);
});

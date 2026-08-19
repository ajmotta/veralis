import { analyzeCase } from "../../../src/ai/responses-client";
import type { CaseState } from "../../../src/domain/schemas/case-state";

const MAX_BODY_BYTES = 64_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 5;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function isCaseState(value: unknown): value is CaseState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CaseState>;
  return typeof candidate.caseId === "string"
    && typeof candidate.version === "number"
    && typeof candidate.business === "object"
    && typeof candidate.user === "object"
    && typeof candidate.objective === "object"
    && typeof candidate.sources === "object"
    && typeof candidate.financial === "object"
    && typeof candidate.operations === "object"
    && typeof candidate.metrics === "object"
    && typeof candidate.reasoning === "object"
    && Array.isArray(candidate.evidence)
    && Array.isArray(candidate.calculations)
    && typeof candidate.quality === "object"
    && typeof candidate.conversation === "object";
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function authenticatedUserId(request: Request): string | null {
  const userId = request.headers.get("oai-authenticated-user-id")?.trim();
  const email = request.headers.get("oai-authenticated-user-email")?.trim();
  return userId && email ? userId : null;
}

function rateLimit(userId: string): number | null {
  const now = Date.now();
  const current = rateLimitBuckets.get(userId);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  if (current.count >= RATE_LIMIT_REQUESTS) return Math.ceil((current.resetAt - now) / 1_000);
  current.count += 1;
  return null;
}

function withinCaseLimits(caseState: CaseState): boolean {
  return caseState.sources.files.length <= 12
    && caseState.sources.userStatements.length <= 40
    && caseState.sources.conflicts.length <= 40
    && caseState.financial.periods.length <= 36
    && caseState.operations.periods.length <= 36
    && caseState.evidence.length <= 500
    && caseState.calculations.length <= 250
    && caseState.objective.currentQuestion.length <= 2_000;
}

export async function POST(request: Request): Promise<Response> {
  const userId = authenticatedUserId(request);
  if (!userId) return json({ error: "AUTH_REQUIRED", message: "Entre com o ChatGPT para analisar dados." }, 401);

  const retryAfter = rateLimit(userId);
  if (retryAfter !== null) {
    const response = json({ error: "RATE_LIMITED", message: "Aguarde antes de enviar outra análise." }, 429);
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "PAYLOAD_TOO_LARGE", message: "O pedido excede o limite seguro." }, 413);
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: "PAYLOAD_TOO_LARGE", message: "O pedido excede o limite seguro." }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "INVALID_JSON", message: "Envie um JSON válido." }, 400);
  }

  const caseState = (body as { caseState?: unknown } | null)?.caseState;
  if (!isCaseState(caseState)) {
    return json({ error: "INVALID_CASE_STATE", message: "O estado do caso é inválido ou incompleto." }, 400);
  }
  if (!withinCaseLimits(caseState)) {
    return json({ error: "CASE_LIMIT_EXCEEDED", message: "Reduza períodos, fontes ou evidências antes de continuar." }, 413);
  }

  return json(await analyzeCase(caseState));
}

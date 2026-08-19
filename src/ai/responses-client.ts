import type { CaseState } from "../domain/schemas/case-state";
import { analyzeOffline, type OfflineAnalysisResult } from "./orchestration/offline-analyzer";
import { verifyStructuredResponse, type VerificationResult } from "./orchestration/verifier";
import { buildReasoningPrompt } from "./prompts/system";
import { STRUCTURED_RESPONSE_JSON_SCHEMA } from "./prompts/response-schema";
import type { StructuredResponse } from "./schemas/response";

const RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_TIMEOUT_MS = 30_000;

export type AnalysisMode = OfflineAnalysisResult["mode"] | "OPENAI" | "DETERMINISTIC_FALLBACK";

export type ProviderFailureCode =
  | "AI_NOT_CONFIGURED"
  | "API_HTTP_ERROR"
  | "API_TIMEOUT"
  | "INVALID_STRUCTURED_OUTPUT"
  | "NETWORK_ERROR"
  | "VERIFICATION_FAILED";

export interface AnalysisResult {
  mode: AnalysisMode;
  response: StructuredResponse;
  verification: VerificationResult;
  provider?: {
    responseId?: string;
    model?: string;
    httpStatus?: number;
    requestId?: string;
  };
  fallbackReason?: ProviderFailureCode;
}

interface ResponsesApiEnvelope {
  id?: unknown;
  model?: unknown;
  output_text?: unknown;
  output?: unknown;
}

export interface ResponsesClientOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function safeProviderMetadata(envelope: ResponsesApiEnvelope | null) {
  return {
    ...(typeof envelope?.id === "string" ? { responseId: envelope.id } : {}),
    ...(typeof envelope?.model === "string" ? { model: envelope.model } : {}),
  };
}

function safeHttpMetadata(response: Response): NonNullable<AnalysisResult["provider"]> {
  const requestId = response.headers.get("x-request-id");
  return {
    httpStatus: response.status,
    ...(requestId ? { requestId } : {}),
  };
}

function extractOutputText(envelope: ResponsesApiEnvelope): string | null {
  if (typeof envelope.output_text === "string") return envelope.output_text;
  if (!Array.isArray(envelope.output)) return null;

  for (const item of envelope.output) {
    if (typeof item !== "object" || item === null) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part !== "object" || part === null) continue;
      const candidate = part as { type?: unknown; text?: unknown };
      if (candidate.type === "output_text" && typeof candidate.text === "string") return candidate.text;
    }
  }
  return null;
}

function deterministicFallback(
  caseState: CaseState,
  fallbackReason: ProviderFailureCode,
  provider?: AnalysisResult["provider"],
  verification?: VerificationResult,
): AnalysisResult {
  const offline = analyzeOffline(caseState);
  return {
    ...offline,
    mode: offline.mode === "SAFE_FALLBACK" ? "SAFE_FALLBACK" : "DETERMINISTIC_FALLBACK",
    verification: verification ?? offline.verification,
    fallbackReason,
    ...(provider && Object.keys(provider).length > 0 ? { provider } : {}),
  };
}

function classifyFetchFailure(error: unknown): ProviderFailureCode {
  return error instanceof DOMException && error.name === "TimeoutError"
    ? "API_TIMEOUT"
    : "NETWORK_ERROR";
}

export async function analyzeCase(
  caseState: CaseState,
  options: ResponsesClientOptions = {},
): Promise<AnalysisResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    return deterministicFallback(caseState, "AI_NOT_CONFIGURED");
  }

  const prompt = buildReasoningPrompt(caseState);
  const format = STRUCTURED_RESPONSE_JSON_SCHEMA;
  let envelope: ResponsesApiEnvelope | null = null;

  try {
    const response = await (options.fetchImpl ?? fetch)(RESPONSES_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: prompt.system,
        input: prompt.input,
        text: {
          format: {
            type: "json_schema",
            name: format.name,
            strict: format.strict,
            schema: format.schema,
          },
        },
        max_output_tokens: 6_000,
        store: false,
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      return deterministicFallback(caseState, "API_HTTP_ERROR", safeHttpMetadata(response));
    }
    envelope = await response.json() as ResponsesApiEnvelope;
    const outputText = extractOutputText(envelope);
    if (!outputText) {
      return deterministicFallback(caseState, "INVALID_STRUCTURED_OUTPUT", safeProviderMetadata(envelope));
    }

    let structured: StructuredResponse;
    try {
      structured = JSON.parse(outputText) as StructuredResponse;
    } catch {
      return deterministicFallback(caseState, "INVALID_STRUCTURED_OUTPUT", safeProviderMetadata(envelope));
    }

    const verification = verifyStructuredResponse(structured, caseState);
    if (!verification.ok) {
      return deterministicFallback(
        caseState,
        "VERIFICATION_FAILED",
        safeProviderMetadata(envelope),
        verification,
      );
    }

    return {
      mode: "OPENAI",
      response: structured,
      verification,
      provider: safeProviderMetadata(envelope),
    };
  } catch (error) {
    return deterministicFallback(
      caseState,
      classifyFetchFailure(error),
      safeProviderMetadata(envelope),
    );
  }
}

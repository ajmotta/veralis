import type { CaseState } from "../../domain/schemas/case-state";
import type { StructuredResponse } from "../schemas/response";
import { buildSafeFallback } from "./fallback";
import { synthesizeDeterministicResponse } from "./synthesizer";
import { verifyStructuredResponse, type VerificationResult } from "./verifier";

export interface OfflineAnalysisResult {
  mode: "DETERMINISTIC_DEMO" | "SAFE_FALLBACK";
  response: StructuredResponse;
  verification: VerificationResult;
}

export function analyzeOffline(caseState: CaseState): OfflineAnalysisResult {
  try {
    const response = synthesizeDeterministicResponse(caseState);
    const verification = verifyStructuredResponse(response, caseState);
    if (verification.ok) return { mode: "DETERMINISTIC_DEMO", response, verification };

    const fallback = buildSafeFallback(caseState);
    return {
      mode: "SAFE_FALLBACK",
      response: fallback,
      // Preserve verifier findings for diagnostics without returning a stack or
      // any document content.
      verification,
    };
  } catch {
    const fallback = buildSafeFallback(caseState);
    return {
      mode: "SAFE_FALLBACK",
      response: fallback,
      verification: {
        ok: false,
        issues: [{
          code: "MISSING_EVIDENCE",
          path: "analysis",
          message: "Deterministic analysis could not be completed.",
        }],
      },
    };
  }
}

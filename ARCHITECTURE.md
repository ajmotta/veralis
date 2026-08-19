# Veralis architecture

## Product boundary

Veralis is financial decision support, not an ERP, accounting system, audit, legal opinion, tax engine, or generic chatbot. P0 covers private early-childhood education (ages 0–5) in São Paulo.

## Runtime flow

1. The upload adapter validates file type and limits before parsing.
2. The normalizer maps source rows into canonical accounts and preserves unmapped rows and conflicts.
3. The case reducer stores files, user facts, corrections, and version history in one typed state.
4. The deterministic engine computes metrics and a reconciled MECE performance bridge at full precision.
5. The verifier rejects unsupported recommendations, failed reconciliations, and numeric claims without calculations.
6. The reasoning layer receives only the canonical state and deterministic results, activates bounded expert lenses, and returns a structured response.
7. The UI renders the direct answer, evidence, calculations, uncertainty, one next question, and reversible actions.

## Central contracts

- Currency tolerance: R$ 0.02.
- Percentage-point tolerance: 0.01 p.p.
- UI rounding: BRL 2 decimals, percentages 1 decimal, ratios 2 decimals.
- Allowed comparisons: month/month, month/prior-year month, same-YTD, and rolling 12 months.
- Unknown inputs remain `UNKNOWN`; low-confidence mappings remain `UNMAPPED`.
- A conflict is a first-class object and is never resolved silently.
- All material claims cite evidence IDs. Recommendations also cite assumptions and calculations.
- `ground_truth.json` is test-only and is never imported by runtime code.

## AI boundary

The orchestrator selects conditional CFO, Operations, Academic, and Growth lenses using deterministic routing. Lenses share one canonical state and cannot mutate financial truth. The synthesizer preserves disagreements and cannot change engine results. If the OpenAI call fails, deterministic analysis remains available.

## Storage and authentication

The public demo is anonymous, synthetic, resettable, and device-local. A private route may use dispatch-owned Sign in with ChatGPT; authentication never blocks the public demo. P0 has no database and no persistent document storage.


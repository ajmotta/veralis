# Veralis

**Seu CFO dia e noite.**

Veralis connects a school's financial and operational data to explain what changed, why it changed, and what to do next. P0 is intentionally focused on private early-childhood schools (ages 0–5) in São Paulo, Brazil.

> Demo environment. Do not submit real personal or financial information.

## The problem

Small schools often have accounting reports, enrollment files, class capacity, discounts, and payroll data in separate places. Growth can look healthy while realized revenue per student and operating margin deteriorate. Veralis turns those sources into an evidence-linked financial decision, and asks one precise question when the available data is insufficient.

## Product

The public Demo Mode loads a 100% synthetic Escola Horizonte fixture. The golden journey shows student growth alongside weak revenue realization, rising discounts, payroll growth, and an underoccupied new class. When the user confirms that a class and two positions were added, the case state changes, metrics recalculate, and the diagnosis updates.

Core interaction:

`arquivo → normalizar → reconciliar → calcular → diagnosticar → perguntar → atualizar → recomendar → mostrar evidência`

The launch workspace also includes a synthetic regional benchmark, a prioritized
action plan, a question bank, and local CSV validation. The benchmark is not
market research and cannot identify a real school.

## Why this is not an LLM wrapper

- A typed canonical case state records sources, user facts, conflicts, uncertainty, and corrections.
- A deterministic engine owns formulas, comparison rules, rounding, and metric availability.
- A MECE performance bridge must reconcile within R$ 0.02.
- An evidence graph links material claims and recommendations back to sources and calculations.
- A product-specific eval suite tests UNKNOWN, CONFLICT, injection resistance, and hallucination boundaries.

## Architecture

`UI → Case State → Normalizer → Deterministic Financial Engine → Verifier → OpenAI Reasoning → Structured Response → UI`

The OpenAI Responses API is optional at runtime. When a server-side key is configured, bounded CFO, Operations, Academic, and Growth lenses interpret the same canonical state. The deterministic fallback keeps the demo usable if the model is unavailable. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Setup

Requirements: Node.js 22.13 or newer.

```bash
npm ci
copy .env.example .env.local
npm run fixture:generate
npm run dev
```

Configure `OPENAI_API_KEY` only in `.env.local` or the Sites secret manager. Never expose it to the browser. `OPENAI_MODEL` controls the reasoning model.

## Public fixture

`fixtures/public/veralis-demo/` is generated from one TypeScript source of truth and contains:

- `dre_mensal.xlsx`
- `turmas.csv`
- `matriculas.csv`
- `equipe.csv`
- `recebimentos.csv`
- `ground_truth.json` for tests/evals only

Runtime code must never import `ground_truth.json`. Regenerate all derived files together with `npm run fixture:generate`.

## Tests

```bash
npm run test:unit
npm run test:integration
npm test
```

The eval catalog lives in `evals/veralis-ei/` and covers profitability, margin timing, price/discount/volume, MECE bridging, receivables semantics, scenarios, action ordering, missing data, source conflicts, prompt injection, and unavailable metrics.

## Privacy and security

- Public deployment defaults to `SYNTHETIC_DATA_ONLY=true`.
- Children's personal data is unnecessary for the core analysis.
- Private QA fixtures and accounting documents are excluded from source control.
- Uploaded document content is data, never instruction.
- Logs exclude document content, names, CPF, full financial rows, and secrets.
- The public CSV checker runs in the browser, rejects likely PII, and does not persist files.
- XLSX processing is intentionally unavailable in the public demo until the private pipeline is complete.

See `docs/policies/` for AI behavior, privacy, data handling, security, financial scope, and regulatory boundaries.

## Limitations

- Veralis is decision support, not an audit, accounting opinion, legal opinion, or tax service.
- P0 does not persist user files or conversation history.
- PDF extraction is secondary and cannot become deterministic truth without reconciliation and confirmation.
- Sign in with ChatGPT is an optional private surface and never blocks the public demo.

## Contributing

Add unit coverage for financial formulas, preserve evidence references, and run the full test suite before opening a pull request. Never commit secrets, PII, private fixtures, or real school financial data. Read [SECURITY.md](SECURITY.md) before publishing changes.

## License

Apache License 2.0. See [LICENSE](LICENSE).

# Security policy

Veralis is a public synthetic-data demonstration. Do not submit real school,
child, family, employee, or financial records.

## Minimum public-release guarantees

- No API key, local environment file, private fixture, source document, or generated private inventory is committed.
- The public demo remains functional without calling the OpenAI API.
- `/api/analyze` requires a ChatGPT-authenticated user, enforces payload limits, and applies a per-user rate limit.
- Model output cannot replace deterministic calculations unless verification passes.
- Public benchmarks are reproducible synthetic comparisons and never claims about real schools.
- Uploaded CSV content is inspected locally and is not persisted. XLSX is blocked on the public surface.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for this repository. Do not open a
public issue containing a secret, exploit, personal data, or a real school file.

## Supported version

Only the latest deployed version and the default branch receive security fixes.

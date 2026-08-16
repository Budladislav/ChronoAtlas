# ChronoAtlas working contract

- Before product work, read `docs/PRODUCT_SPEC.md` and relevant entries in `docs/DECISIONS.md`.
- Preserve the local-first, private, backend-free architecture. Never add analytics, remote fonts, runtime services, or personal data to the repository.
- Resolve small ambiguities consistently; ask only when data meaning, privacy, irreversible actions, or product boundaries would change.
- Every behavior change needs relevant tests, a user-facing `CHANGELOG.md` entry, and a version change.
- Data-model changes require an explicit migration plus preservation tests for old data and backups.
- Run `npm run check` before completion and E2E before milestone releases. Inspect the final diff.
- Update the product spec or decisions when approved behavior changes; do not leave durable decisions only in chat.
- Avoid unrelated rewrites. Report the result, verification, version, and remaining limitations.

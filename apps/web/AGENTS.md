# Web agent rules

- Use strict TypeScript and `.tsx`; do not add JavaScript application files.
- Follow `src/app`, `src/features/<feature>`, and `src/shared` boundaries.
- A feature owns its UI, state, validation, and API adapter. `shared` may not import a feature.
- Prefer local state and React context. Add a server-state library only when caching/invalidation requirements exist; do not introduce Redux by default.
- Keep access tokens in memory. Never store refresh tokens or Google credentials in browser storage.
- Use relative `/api/...` URLs so development proxy and production reverse proxy share one client behavior.
- Design mobile-first and bandwidth-conscious. Support keyboard navigation and basic screen-reader semantics.
- Preserve interface language, explanation language, and exam language as separate concepts.
- All user-visible text belongs in localization resources.
- Add a component test for a success state and a failure/edge state.

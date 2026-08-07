# Web agent rules

- Inherit the repository-wide contract in [`../../AGENTS.md`](../../AGENTS.md).
- Read root [`DESIGN.md`](../../DESIGN.md) and [`docs/design/README.md`](../../docs/design/README.md) before changing UI structure, styling, animation, navigation, or shared visual tokens.
- Use strict TypeScript and `.tsx`; do not add JavaScript application files.
- Follow `src/app`, `src/features/<feature>`, and `src/shared` boundaries. An accepted `PX-NNN` brief may additionally introduce `src/prototype/<journey>` for explicitly non-production fixtures and flows.
- A feature owns implemented production UI, state, validation, and API adapters. Prototype modules and production features may not import each other. `shared` may import neither; `app` alone composes production, prototype, and unavailable destinations.
- Prefer local state and React context. Add a server-state library only when caching/invalidation requirements exist; do not introduce Redux by default.
- Keep access tokens in memory. Never store refresh tokens or Google credentials in browser storage.
- Use relative `/api/...` URLs so development proxy and production reverse proxy share one client behavior.
- Design mobile-first and bandwidth-conscious. Support keyboard navigation, visible focus, semantic HTML, screen-reader status, and `prefers-reduced-motion`.
- Design the complete user flow and the relevant initial, loading, empty, validation, failure, stale, success, and recovery states before polishing an isolated component.
- Consume semantic CSS variables from `src/styles.css`. Raw color values belong only in the shared token declarations, and shared token changes begin in root `DESIGN.md`.
- Keep the visual core white/neutral with restrained contextual pastel blocks. Do not default to gradients, glow, glass panels, abstract blobs, random pastel cards, equal-weight dashboard card grids, decorative AI imagery, or perpetual motion.
- Use **`lucide-react`** for product icons. Prefer Lucide icon-only controls (with localized `aria-label`) for repeated secondary actions such as remove/delete-in-list; keep text labels on primary and high-stakes actions. Do not hand-author one-off SVG icons or use emoji for UI chrome when Lucide has a match.
- Use micro-interactions only to explain cause and effect: press acknowledgement, focus, validation, progress, disclosure, step continuity, or a restrained milestone. The same flow must remain understandable with reduced motion.
- Preserve interface language, explanation language, and exam language as separate concepts.
- All user-visible text belongs in localization resources.
- Add a component test for a success state and a failure, validation, accessibility, or edge state.
- For material layout changes, verify at least one narrow mobile and one desktop viewport, keyboard order, reduced motion, and layout-sensitive content in Indonesian, English, and Chinese.

- Review the backend agent's initialized contract as a consumer. Do not hand-edit TypeSpec or invent a competing wire model; record a concrete `CR-NN` request in the active slice and implement only from its accepted contract checkpoint.

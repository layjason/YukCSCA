# YukCSCA design workflow

> **Classification: executable design guide.** Product requirements define behavior. [`DESIGN.md`](../../DESIGN.md) defines the repository-wide visual and interaction language. This guide defines how agents apply it without turning prototypes into product promises.

## Sources and authority

For UI work, read in this order:

1. the accepted delivery brief and linked requirements or exploratory story references;
2. root [`DESIGN.md`](../../DESIGN.md);
3. the nearest `AGENTS.md`;
4. current routes, shared styles, components, and tests.

`DESIGN.md` may not create permissions, states, data fields, entitlements, scoring rules, or API behavior. A mockup may explore presentation, but only accepted requirements and slice decisions authorize product behavior.

## Two design horizons

### Product-journey prototype

A non-production prototype may cover several future screens to test navigation, terminology, flow continuity, and data needs. Prototype-only behavior must be visibly and structurally isolated from implemented routes and must not imply backend availability.

Prototype rules:

- use fixtures or an explicit mock adapter;
- label unavailable or exploratory behavior;
- keep prototype view models separate from generated API types;
- never import prototype code into production feature modules;
- do not add TypeSpec merely to make an exploratory screen look realistic;
- delete or promote prototype code deliberately when the relevant slice becomes active.

### Production vertical slice

A production UI is implemented only from an accepted slice. Its TypeSpec contract is just-in-time for that slice, and the frontend may proceed against a contract-backed mock while the backend is implemented.

- **Dev Fallback Interceptor**: API fetch calls attempt the real backend endpoint first. If offline or `404`/`401` in local development (`import.meta.env.DEV`), they catch failures and return contract-backed mocks matching generated OpenAPI types; in production (`import.meta.env.DEV === false`), fallbacks are bypassed and real errors are thrown.

The slice must record the route/navigation entry, complete state set, accessibility/localization behavior, and interaction intent before implementation.

## Agent UI task protocol

### 1. Understand the journey

Before styling a component, identify:

- the user's current context;
- what triggered this screen;
- the one outcome the user is trying to reach;
- the primary action;
- the next state or route;
- how the user recovers from invalid input, latency, stale state, or failure.

Review the preceding and following step. A polished isolated screen is insufficient when the journey remains disconnected.

### 2. Define screen states

List the applicable states in the slice frontend plan:

```text
initial -> loading -> ready -> submitting -> success
                         \-> validation-error
                         \-> recoverable-error -> retry
                         \-> stale/already-completed -> canonical destination
```

Also consider empty, offline/weak connection, authorization restriction, and reduced-motion behavior when relevant.

### 3. Choose visual roles

Use semantic roles from `DESIGN.md` rather than inventing page-specific colors. Pastels identify context; they are not assigned randomly per card. Use one dominant pastel region, then return to white or neutral canvas.

Feature styles consume CSS custom properties from `apps/web/src/styles.css`. Raw hex values belong only in the shared token declarations.

### 4. Implement static hierarchy first

Complete semantic HTML, content order, responsive layout, visible focus, and all task states before adding motion. Do not use animation to repair unclear hierarchy.

### 5. Add purposeful interaction

Motion should communicate cause and effect:

- press acknowledgement;
- focus and validation feedback;
- progress change;
- disclosure or step continuity;
- restrained milestone completion.

No perpetual decoration, fake typing, routine confetti, bounce-heavy transitions, or motion that blocks input. Every feature must remain understandable under `prefers-reduced-motion: reduce`.

### 6. Verify visually and behaviorally

Use the smallest applicable matrix:

| Dimension | Minimum evidence                                             |
| --------- | ------------------------------------------------------------ |
| Viewport  | one narrow mobile width and one desktop width                |
| Input     | pointer and keyboard                                         |
| Motion    | normal and reduced motion                                    |
| Language  | Indonesian, English, and Chinese on layout-sensitive screens |
| State     | ready plus the relevant loading/error/empty/success states   |
| Content   | short and long realistic values; no fabricated personal data |

For high-impact or journey-level UI, capture screenshots or Playwright traces and record them in the slice verification evidence. Visual evidence does not replace component, accessibility, or end-to-end assertions.

## CSS and component policy

The current repository intentionally uses a lightweight CSS foundation rather than a UI framework. Keep it simple until repeated patterns justify extraction.

- `apps/web/src/styles.css` owns global tokens, resets, base focus/motion behavior, and current baseline screen styles.
- A feature may own feature-specific CSS when its first real component requires it.
- Add a shared UI primitive only after at least two real features need the same semantic behavior or when consistency/accessibility risk justifies centralization sooner.
- Do not add a component library, animation library, CSS-in-JS runtime, or utility framework merely to reproduce the design language.
- Prefer CSS transitions and keyframes for small interactions. Introduce a motion library only for an accepted flow whose state continuity cannot be expressed clearly with the current stack.

## Icons (Lucide)

Product UI icons come from **`lucide-react`** (see root `DESIGN.md` Icons section).

- Use Lucide for navigation, toolbars, empty states, and repeated secondary actions such as remove/delete-in-list.
- Prefer icon-only controls with localized `aria-label` for dense secondary destructive actions; keep text on primary and high-stakes buttons.
- Do not hand-draw ad-hoc SVG icons when Lucide already provides the metaphor.
- Do not use emoji or unicode symbols as the long-term product icon system.
- Import only the icons you need: `import { Trash2, ChevronRight } from 'lucide-react'`.

## Anti-generic review

Reject a proposed screen when it relies on any of these as its main visual idea:

- gradient background plus centered floating card;
- glass panel, neon glow, or blurred abstract blobs;
- a grid of equal dashboard cards with no dominant task;
- random pastel cards;
- large sparkle/robot decoration;
- generic AI marketing copy;
- excessive rounded containers inside rounded containers;
- animation that exists only to make the page look busy.

Prefer a clear content sequence, one dominant task surface, confident type, broad white space, and one meaningful pastel block.

## Design-token changes

When a new visual role is genuinely required:

1. explain the semantic gap in the active slice or review note;
2. update the YAML token/component in root `DESIGN.md`;
3. mirror the value in CSS custom properties or the future token output;
4. update affected primitives and states;
5. check contrast and all three languages;
6. avoid renaming unrelated established tokens.

The official `@google/design.md` linter can validate token references and contrast once the repository deliberately pins the tool. Until then, do not add an unpinned network-dependent command to required CI.

## Definition of design-ready

A slice is ready for frontend implementation when:

- the user goal and route entry/exit are known;
- the state set and recovery behavior are listed;
- primary and secondary actions are unambiguous;
- mobile and localization constraints are understood;
- a prototype or sketch has resolved material navigation uncertainty, when needed;
- any behavior-changing question has passed the human decision gate;
- TypeSpec is ready when the production UI depends on public HTTP behavior.

## Definition of visually done

A production UI is visually done when:

- it follows the journey and state model, not just a static mock;
- it uses repository tokens and the correct pastel semantics;
- it contains no default gradient/glass/glow/card-grid pattern;
- keyboard, focus, mobile, localization, and reduced motion are verified;
- loading, error, recovery, and completion feel connected;
- deviations are explicit and reviewed;
- the active slice names the evidence.

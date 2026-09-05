---
version: alpha
name: YukCSCA Learning Canvas
description: 'A calm, human academic interface built on white space, strong black typography, and a restrained family of warm pastel learning surfaces. YukCSCA should feel trustworthy enough for parents and schools, friendly enough for teenagers, and alive through small purposeful interactions rather than gradients, glow, glass effects, or dashboard decoration.'

colors:
  primary: '#1f1d3d'
  on-primary: '#ffffff'
  ink: '#171717'
  ink-muted: '#5d5d63'
  canvas: '#ffffff'
  app-background: '#fafaf7'
  surface-soft: '#f4f4f0'
  surface-raised: '#ffffff'
  border: '#deded8'
  border-strong: '#b8b8b0'
  focus: '#4f46a5'
  block-lime: '#e2efb7'
  block-lilac: '#ddd2f7'
  block-cream: '#f7efd9'
  block-mint: '#d8ecd9'
  block-pink: '#f3dada'
  block-coral: '#f6d3c3'
  block-sky: '#dceaf6'
  block-navy: '#1f1d3d'
  semantic-success: '#1f7a45'
  semantic-success-soft: '#e0f1e6'
  semantic-warning: '#9a5b13'
  semantic-warning-soft: '#f8ead2'
  semantic-danger: '#b4232f'
  semantic-danger-soft: '#f9e1e3'
  semantic-info: '#315b8a'
  semantic-info-soft: '#e2edf8'
  pronunciation: '#4aa6e8'
  overlay-scrim: '#171717'

typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -1.20px
    fontFeature: kern
  page-title:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.72px
    fontFeature: kern
  section-title:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.26px
    fontFeature: kern
  card-title:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: -0.10px
    fontFeature: kern
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: -0.10px
    fontFeature: kern
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: -0.05px
    fontFeature: kern
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
    fontFeature: kern
  label:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: 0
    fontFeature: kern
  button:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.05px
    fontFeature: kern
  eyebrow:
    fontFamily: ui-monospace
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.30
    letterSpacing: 1.20px
    fontFeature: kern
  caption:
    fontFamily: ui-monospace
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0.48px
    fontFeature: kern

rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 20px
  xl: 28px
  pill: 999px
  full: 9999px

spacing:
  hair: 1px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 72px

components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.button}'
    rounded: '{rounded.pill}'
    padding: 12px 20px
  button-secondary:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.button}'
    rounded: '{rounded.pill}'
    padding: 11px 19px
  button-quiet:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.ink}'
    typography: '{typography.button}'
    rounded: '{rounded.pill}'
    padding: 10px 16px
  button-danger:
    backgroundColor: '{colors.semantic-danger}'
    textColor: '{colors.on-primary}'
    typography: '{typography.button}'
    rounded: '{rounded.pill}'
    padding: 12px 20px
  icon-button:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.ink}'
    typography: '{typography.button}'
    rounded: '{rounded.full}'
    size: 44px
  text-input:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px 14px
  app-shell:
    backgroundColor: '{colors.app-background}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.xs}'
  navigation-rail:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.lg}'
    padding: 12px
  navigation-item-active:
    backgroundColor: '{colors.block-lilac}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: 10px 14px
  content-card:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: 24px
  color-block-lime:
    backgroundColor: '{colors.block-lime}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.xl}'
    padding: 32px
  color-block-lilac:
    backgroundColor: '{colors.block-lilac}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.xl}'
    padding: 32px
  color-block-cream:
    backgroundColor: '{colors.block-cream}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.xl}'
    padding: 32px
  color-block-mint:
    backgroundColor: '{colors.block-mint}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.xl}'
    padding: 32px
  color-block-sky:
    backgroundColor: '{colors.block-sky}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.xl}'
    padding: 32px
  feedback-success:
    backgroundColor: '{colors.semantic-success-soft}'
    textColor: '{colors.semantic-success}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 12px 16px
  feedback-warning:
    backgroundColor: '{colors.semantic-warning-soft}'
    textColor: '{colors.semantic-warning}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 12px 16px
  feedback-danger:
    backgroundColor: '{colors.semantic-danger-soft}'
    textColor: '{colors.semantic-danger}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 12px 16px
  toast-notification:
    backgroundColor: '{colors.semantic-success-soft}'
    textColor: '{colors.semantic-success}'
    borderColor: '{colors.border-strong}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 14px 20px
  progress-track:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.ink-muted}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.pill}'
    height: 10px
  progress-value:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.pill}'
    height: 10px
  study-chip:
    backgroundColor: '{colors.block-cream}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: 8px 12px
---

## Authority and intent

`DESIGN.md` is the visual and interaction-design authority for YukCSCA. Product requirements and an accepted vertical-slice plan still decide **what** the application does, which roles may do it, and what data is allowed. This file decides **how** that behavior is presented and felt.

When sources conflict, use this order:

1. Product requirements and safety/privacy rules.
2. Accepted slice behavior and accessibility acceptance criteria.
3. This design system.
4. Existing screen styling.

Do not change a product rule merely to preserve a visual pattern. Do not invent product behavior from a decorative mockup.

## Overview

YukCSCA should feel like a well-organized study desk: mostly white, calm, readable, and structured, with a small number of warm pastel surfaces that make important learning moments easier to recognize. It is an academic product, but it is not a school administration portal. It should feel focused, encouraging, semi-casual, and made for real teenagers rather than generated from a generic SaaS template.

The system borrows the useful principle of a monochrome core interrupted by large pastel color blocks, but adapts it for an authenticated learning application rather than a marketing site. Pastels identify learning context, not decoration. White space separates tasks. Strong typography provides hierarchy. Motion explains continuity and acknowledges effort.

### Product personality

- **Calm:** the interface reduces uncertainty and never rushes the learner.
- **Encouraging:** progress and recovery are visible without exaggerated celebration.
- **Direct:** one clear primary action per task region.
- **Human:** copy, timing, feedback, and motion respond to what the learner just did.
- **Trustworthy:** no manipulative streak pressure, false urgency, hidden state, or unexplained AI output.
- **Youthful, not childish:** soft color and light motion are welcome; cartoon clutter and toy-like controls are not.

## Signature visual language

### Monochrome core

Use `{colors.canvas}`, `{colors.app-background}`, `{colors.ink}`, and `{colors.primary}` for the shell, reading surfaces, navigation, forms, and high-confidence actions. This keeps the product legible and serious.

### Pastel learning surfaces

Pastels are broad context surfaces, not random card colors. Use one pastel family for one meaningful region:

- `{colors.block-lime}`: completion, readiness, a feasible plan, or a positive next step.
- `{colors.block-lilac}`: onboarding, explanation, reflection, or guided help.
- `{colors.block-cream}`: neutral study context, notes, templates, or low-pressure setup.
- `{colors.block-mint}`: practice feedback, improvement, or reviewed progress.
- `{colors.block-pink}`: supportive reminders and human-care moments; never errors.
- `{colors.block-coral}`: motivation or a bounded celebration.
- `{colors.block-sky}`: information, schedule, reference material, and exam context.
- `{colors.block-navy}`: rare inverse emphasis such as a focused exam mode or major call to action.

A screen should usually expose at most one dominant pastel block above the fold. White canvas must separate unrelated colored regions. Do not assign a different pastel to every card.

### Flat before elevated

The system is mostly flat. Use border, spacing, and surface changes before shadows. A soft shadow is allowed only for a temporary floating object such as a menu, dialog, or dragged item. Pastel blocks never need a shadow.

## Typography

Use Inter, Geist, or the system sans fallback. Do not fetch a font from a third-party CDN at runtime. Chinese and Indonesian text must remain readable with system fallbacks.

- `{typography.display}` is reserved for unauthenticated or milestone moments, never routine dashboard headings.
- `{typography.page-title}` names the current task or destination.
- `{typography.section-title}` begins a meaningful content region.
- `{typography.card-title}` is for a contained learning object, not every row.
- `{typography.body}` is the default application copy.
- `{typography.eyebrow}` and `{typography.caption}` provide taxonomy only. Keep them short, uppercase where the locale supports it naturally, and never use them for paragraphs.

Prefer sentence case. Avoid all-caps headings, title case on every label, and overly clever wording. Keep instructional paragraphs near 60–72 characters per line when practical.

## Layout and information rhythm

### Base grid

Use an 8px rhythm with 4px only for optical adjustment. The common sequence is `{spacing.xs}` → `{spacing.md}` → `{spacing.lg}` → `{spacing.xl}`. Reserve `{spacing.section}` for major page transitions.

### Content width

- Reading and form flows: 560–720px.
- Learning workspace: up to 1180px.
- Long prose: approximately 68ch.
- The interface may use a wider shell, but the active task should not stretch just because space exists.

### App shell

The authenticated shell should make location and next action obvious. On desktop, use a compact left navigation or top navigation plus a clear content column. On mobile, use a small bottom navigation only for stable top-level destinations. Do not expose future or unavailable destinations as if they work.

Top-level student destinations should remain stable once implemented: Today, Learn, Practice, Mock Exam, Progress, and Profile. Availability is driven by the route manifest and accepted slices, not by DESIGN.md.

### Card discipline

A card must represent one bounded object or decision. Do not wrap every heading and paragraph in a card. Prefer:

1. page region;
2. one dominant task surface;
3. supporting list or inline status;
4. secondary action.

A dashboard made from many equal white cards is prohibited because it hides hierarchy and looks machine-generated.

## Natural human experience flows

Every important flow should feel continuous rather than like a collection of screens. Design the full sequence before polishing individual components.

### Flow grammar

A healthy task flow uses this order:

1. **Orient:** explain where the learner is and why the task matters.
2. **Act:** present one primary action and the minimum required information.
3. **Acknowledge:** react immediately to input with a local state change.
4. **Wait honestly:** show progress when work takes time; never freeze or fake completion.
5. **Resolve:** show what changed, what was saved, and what happens next.
6. **Recover:** preserve safe input and offer a specific retry or correction path.

Do not navigate away so quickly that success cannot be perceived. A short acknowledgement may appear before the next route when it adds confidence, but it must not delay routine work.

### State completeness

For every interactive feature, agents must deliberately handle the relevant states:

- initial;
- loading;
- ready;
- empty;
- partial/progress;
- validation error;
- authorization or entitlement restriction;
- recoverable server failure;
- offline or weak connection where relevant;
- success;
- stale or already-completed state.

Missing-state UI is not considered complete merely because the happy path renders.

### Forms

- Validate required shape on blur or submit, not on every keystroke.
- Place an error next to its field and provide a form-level summary only when multiple or non-field errors exist.
- Preserve all safe entered values after failure.
- Explain why sensitive or minor-related information is collected at the point of collection.
- Disable a submit action only while the same request is in flight or when submission is impossible; do not hide the action.
- After success, clearly state what was saved before transitioning when the outcome is not otherwise obvious.

### Learning feedback

- Distinguish correctness, explanation, confidence, hint usage, and next practice. Do not compress them into one green/red state.
- Errors should feel actionable, not punitive.
- Progress language should describe evidence, not praise intelligence or imply guaranteed mastery.
- AI-generated help must be visually framed as assistance and may not look identical to authoritative reviewed content when provenance matters.

## Motion and micro-interactions

Motion exists to explain cause and effect, preserve spatial continuity, acknowledge effort, and reduce uncertainty. It is not decoration.

### Timing

Use these implementation values in CSS variables:

| Role       |  Duration | Use                                                         |
| ---------- | --------: | ----------------------------------------------------------- |
| instant    | 100–120ms | pressed state, checkbox, icon response                      |
| quick      | 160–180ms | hover/focus, small disclosure, inline validation            |
| standard   | 220–260ms | card/list insertion, route-region reveal, progress change   |
| deliberate | 300–360ms | onboarding step transition, dialog, major completion moment |

Default easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Exit motion may use `cubic-bezier(0.4, 0, 1, 1)` and should be slightly faster than entry.

### Required patterns

- Buttons move no more than 1px on hover and scale to about `0.98` while pressed.
- Focus rings appear without layout shift.
- Inline errors fade/slide 4px into place; they do not shake.
- Progress values animate between known states, but numeric meaning remains available immediately to assistive technology.
- New list items may fade and move 6–8px; existing content must not jump unexpectedly.
- A successful milestone may use one restrained color/scale pulse or a very small confetti treatment. Routine saves do not celebrate.
- Skeletons should resemble the final layout and appear only when content is not immediately available. Avoid spinners for page-sized waits.
- Route transitions apply to the content region, not the entire application chrome.

### Prohibited motion

- perpetual floating, bobbing, glowing, or orbiting decoration;
- bounce easing for routine controls;
- parallax inside learning tasks;
- auto-playing decorative animation near exam questions;
- animation that blocks input;
- fake typing for tutor/AI responses;
- confetti for streak maintenance, payment, consent, or sensitive actions.

### Reduced motion

Honor `prefers-reduced-motion: reduce`. Remove transforms and non-essential animation, reduce durations to near-zero, preserve progress/state meaning, and never require motion to understand a change.

## Components

The shared component vocabulary is `{components.app-shell}`, `{components.navigation-rail}`, `{components.navigation-item-active}`, `{components.button-primary}`, `{components.button-secondary}`, `{components.button-quiet}`, `{components.button-danger}`, `{components.icon-button}`, `{components.text-input}`, `{components.content-card}`, `{components.color-block-lime}`, `{components.color-block-lilac}`, `{components.color-block-cream}`, `{components.color-block-mint}`, `{components.color-block-sky}`, `{components.feedback-success}`, `{components.feedback-warning}`, `{components.feedback-danger}`, `{components.progress-track}`, `{components.progress-value}`, and `{components.study-chip}`. These are semantic roles, not a requirement to create a React component for every token before a real feature needs it.

Use `{colors.border}` for normal separators, `{colors.border-strong}` for interactive field boundaries, `{colors.focus}` for the visible focus ring, `{colors.semantic-info}` on `{colors.semantic-info-soft}` for informational status, and `{colors.overlay-scrim}` only behind a modal surface. `{typography.body-lg}` is the largest reading role. `{rounded.sm}` supports small chips or image frames. `{spacing.hair}`, `{spacing.xxs}`, `{spacing.sm}`, and `{spacing.xxl}` remain available for border thickness, optical adjustment, compact gaps, and generous block padding.

### Buttons

`{components.button-primary}` is the single primary action in a task region. It uses `{colors.primary}` rather than a bright brand gradient. A second action uses `{components.button-secondary}` or `{components.button-quiet}`.

Rules:

- Minimum 44px target height.
- Use an imperative verb: “Continue”, “Save profile”, “Start practice”.
- Do not put two primary buttons in one bounded task region.
- Destructive actions must use explicit language and `{components.button-danger}` only after the user understands the consequence.
- Loading buttons keep their width and label context; use “Saving…” rather than replacing the whole control with an unlabeled spinner.

### Icons

YukCSCA uses **[Lucide](https://lucide.dev/)** via the `lucide-react` package as the repository icon library.

Rules:

- Prefer Lucide components over hand-authored SVG paths, emoji, or unicode glyphs for UI chrome (navigation, remove, status, disclosure).
- Import named icons only so bundlers can tree-shake: `import { Trash2 } from 'lucide-react'`.
- Color icons with `currentColor` (default) so CSS and design tokens control appearance.
- Default sizes: **16px** compact inline, **20px** toolbar/icon-button, **24px** navigation or empty-state. Match `{components.icon-button}` at **44×44px** hit target.
- Prefer stroke weight about **1.75–2** for clarity on white and pastel surfaces.
- Pronunciation play uses `{colors.pronunciation}` as a transparent listening glyph (filled speaker cone, stroked waves) on a 44×44px hit target. It is not a filled `{components.icon-button}` and must not sit on a lilac or other pastel pill.
- Reviewed term spans that become tappable after Language help use a dotted underline in `{colors.pronunciation}`. First paint of a scored stem stays unmarked.
- After Language help, hover (wide) or tap (phone) on an underlined span opens a compact gloss bubble: one `{colors.surface-soft}` pill with the explanation-language meaning centered beside a bookmark control, and a small pointer. Do not restate the Chinese surface inside the bubble — the underlined span is already visible. It is not the full term card. Terminology bookmark controls (gloss, term card, notebook) use an empty Lucide `Bookmark` when off and a filled `{colors.pronunciation}` bookmark when on (not a check mark, not `{colors.primary}`). Bookmarking shows `{components.toast-notification}`.
- Do not add a Key phrases tray under a scored stem. The underlines are enough.
- Term-card overlays close with a right-side `{colors.semantic-danger}` X and hide the mobile bottom nav while open. Do not use a bottom Close bar on that sheet.
- Soft content-update notices (`required terms changed`, lesson updated since complete) use a white/neutral surface with `{colors.border}`, not `{colors.block-sky}` or `{colors.block-coral}`.
- Icon-only controls require a localized `aria-label` and usually a `title` tooltip. Visible text remains required for high-stakes or primary actions.
- Use an icon-only `{components.icon-button}` for repeated secondary actions (for example remove row / delete block). Do not use a long text danger pill for those dense list patterns.
- Keep text labels on primary, secondary, and high-stakes destructive actions (publish, archive, confirm dialogs).
- Do not mix Lucide with another general icon set (Heroicons, Material, Font Awesome, emoji) in the same product surface.

### Inputs

`{components.text-input}` uses a visible border on white. Focus changes the border and adds a focus ring. Error changes the border and adds adjacent text; color is not the only indicator.

Do not use placeholder text as the only label. Keep labels visible. Avoid oversized fields unless the expected answer is long.

### Navigation

The active destination uses `{components.navigation-item-active}`. Navigation animation is a subtle background/position change, not a sliding neon indicator. Mobile navigation must not exceed five or six stable destinations.

### Content cards and color blocks

Use `{components.content-card}` for a bounded learning object that benefits from containment. Use one color-block component for a dominant section, onboarding step, plan summary, or milestone.

Pastel blocks may contain white sub-surfaces when a form or dense table needs stronger reading contrast. Avoid nesting one pastel block inside another.

### Progress

`{components.progress-track}` and `{components.progress-value}` show a meaningful bounded quantity only. Never display fabricated precision. Pair progress with a text label and, when useful, the next achievable step.

### Feedback

Use feedback components for local, actionable messages. `{components.toast-notification}` is suitable for a low-risk background acknowledgement or language independence notice. It renders via React portal directly to `document.body` at fixed top-right (`top: 1.5rem; right: 1.5rem; z-index: 99999`) on desktop and top-floating full-width (`top: 1rem; left: 1rem; right: 1rem`) on mobile. Toasts use `{colors.semantic-success-soft}` or `{colors.semantic-info-soft}` with a matching circular icon badge indicator and a manual close button; errors that block the current task stay in the task region.

## Anti-slop rules

The following patterns make YukCSCA look generic, synthetic, or promotional and are prohibited unless a specific accepted design decision overrides them:

- gradient page backgrounds or gradient primary buttons;
- glassmorphism, frosted panels, neon glow, and blurred color blobs;
- a centered hero card floating over an abstract gradient as the default screen template;
- equal-sized cards for every piece of information;
- decorative charts without a learner decision attached;
- random pastel assignment per card;
- excessive pills for static labels;
- large emoji or sparkle icons as generic decoration (use Lucide for product chrome instead);
- copy such as “Unlock your potential”, “AI-powered journey”, or “Supercharge learning” without concrete meaning;
- fake testimonials, fabricated activity, or artificial urgency;
- excessive shadows, oversized border radii, and nested rounded rectangles;
- animated assistants that demand attention while the learner is working;
- hiding ordinary navigation behind novelty interactions.

A good YukCSCA screen should still look intentional in grayscale. Color improves orientation; it does not create the hierarchy by itself.

## Accessibility and inclusive design

- Meet WCAG 2.2 AA contrast for text and meaningful controls.
- Keep touch targets at least 44×44px and provide adequate spacing between adjacent targets.
- Use semantic HTML before ARIA.
- Maintain visible `:focus-visible` treatment on every interactive element.
- Never communicate state by color alone.
- Announce asynchronous success/errors through appropriate live regions without repeating entire pages.
- Maintain logical DOM and keyboard order across responsive layouts.
- Support zoom and text resizing without clipping through 200%.
- Test Bahasa Indonesia, English, and Simplified Chinese. Do not assume translated text has the same length.
- Preserve interface language, explanation language, and exam language as independent concepts.
- Avoid timed interactions unless the product requirement is an actual exam timer; warnings and accommodations must be explicit.

## Responsive behavior

### Breakpoints

Use content-driven breakpoints rather than device labels. Typical reference points:

- below 600px: single-column task flow, edge-to-edge pastel block where appropriate, full-width primary action;
- 600–959px: wider reading column, compact multi-column supporting content;
- 960px and above: persistent application navigation and a bounded main workspace;
- above 1280px: increase outer whitespace, not line length.

### Mobile behavior

Mobile is the primary constraint. Preserve the same task order and capabilities. Do not solve small screens by shrinking text, hiding required explanations, or forcing horizontal scrolling for normal learning content.

Color blocks may lose outer corner rounding when they intentionally reach the viewport edge. Forms remain on white sub-surfaces when a pastel background would reduce clarity.

## Agent implementation protocol

When implementing or reviewing a UI change:

1. Read the accepted slice, this file, and `docs/design/README.md`.
2. Write the user goal, entry state, exit state, primary action, and required loading/empty/error/success states in the slice frontend plan.
3. Reuse an existing token or component role. Add a new role only when existing semantics are insufficient.
4. Implement token changes in `DESIGN.md` first, then mirror them in `apps/web/src/styles.css` or the future design-token module.
5. Keep raw color values inside token declarations. Feature CSS should consume variables or shared primitives.
6. Add motion only after static hierarchy, keyboard order, and state behavior work.
7. Test at a small mobile width and a desktop width, with keyboard navigation and reduced motion.
8. Check all three interface languages on layout-sensitive screens.
9. Capture evidence for happy, loading, error, and completion states when the slice requires visual review.
10. Report intentional deviations from this file in the slice or a decision record; do not silently create a second visual language.

## Token maintenance

- Token names describe semantic roles, not specific pages.
- Add state variants as separate component entries when their properties materially differ.
- Do not rename a widely used token as part of unrelated feature work.
- Keep the CSS custom properties in `apps/web/src/styles.css` aligned with the YAML colors, spacing, radius, and motion guidance.
- The official `@google/design.md` linter may be used when the repository intentionally pins it. Do not add an unpinned network-dependent lint step to required CI.

## Design review checklist

A UI slice is not visually complete until the reviewer can answer yes to the applicable items:

- Is the current location and user goal obvious within a few seconds?
- Is there one dominant action in the active task region?
- Are all relevant states designed, not just the happy path?
- Does the screen preserve safe work after failure?
- Does the UI look deliberate without gradients, glow, or card clutter?
- Does color represent context rather than decoration?
- Are motion and micro-interactions explaining cause and effect?
- Does reduced motion preserve the same information?
- Can the flow be completed by keyboard and at mobile width?
- Do Indonesian, English, and Chinese content fit without hierarchy loss?
- Are AI assistance, reviewed content, progress evidence, and restrictions distinguishable?
- Is the screen consistent with the preceding and following step in the journey?

## Contextual Ask presentation

The shared Ask surface uses a right-hand desktop rail with the host still visible, and a mobile sheet above the shell bottom-navigation offset. Keep the composer in the panel with a localized, accessible arrow-up send button inside the input bar. Wrap assistant text lightly with a 35% lilac / canvas mix and existing border tokens; source chips follow the answer, then corner-down-right follow-up controls. Reviewed provenance may be screen-reader text beside inspectable chips; keep insufficient-evidence copy visible and the composer disclaimer. The product owner requested removing the visible derived-answer label; retain its accessible description. Use a lilac Ask launcher with brief icon tilt on hover/focus, centered follow-up contents, and one focus ring around the whole composer.

Waiting shows a local seconds counter; completion uses the recorded server duration in the collapsed trace disclosure above the answer. Use brief entry, focus, and press feedback, without a perpetual decorative animation. Respect reduced motion and retain 44px controls.

Ask browser-review refinement: assistant answer wraps use white canvas with a quiet border. Source chips stay white; only the icon tile carries the source-kind pastel. The launcher uses a rectangular action with a dark icon tile, text, and directional arrow in a separate spaced row. Mobile Ask meets the measured bottom-navigation height, including its safe-area padding, rather than the shell's conservative content offset.

Latest product-owner Ask refinement: use a compact primary-color pill with a Lucide sparkle and localized Ask label, replacing the tiled launcher. Empty chat centers a localized “How can I help you today?” greeting in the interface language with a one-time gradual reveal; hide it on submission or existing history. Reduced motion displays the full greeting immediately, and screen readers receive the complete sentence. The mobile sheet is reduced to 55dvh with a 34rem cap while retaining navigation clearance and scrolling. This is local welcome animation, not streamed model output.

Latest Ask browser feedback supersedes the navy and cream launcher: use existing sky blue with ink text, reduce launcher-to-host spacing to the 8px rhythm, and remove the extra disclosure-to-answer gap while preserving the 44px trace control. Quote chips reuse MixedProse for both standalone LaTeX and prose with inline math; keep original quote data and accessible labels unchanged, and allow long formulas to scroll within the chip.

Desktop Ask is an open right-hand column: transparent background, no outer rounded frame, and no header/composer dividers. Short conversations settle toward the composer; long conversations keep their own scrolling. Individual answer wraps, source chips, focus indicators, and the mobile sheet remain contained. This presentation follows the product owner's reference without changing conversation behavior.

Desktop learning content beside Ask uses only a thin rounded grey border, preserving its background. Both columns fit the viewport with standard page insets and independent scrolling. The lesson header scrolls with its content. Scrollbars use a thin white thumb (`--color-scrollbar-thumb: #ffffff`) on a transparent track, with a grey edge where supported and stronger grey on hover. Forced-colors mode retains native colors.

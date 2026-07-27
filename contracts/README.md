# API contracts

TypeSpec is the executable public HTTP boundary for an accepted vertical slice. Before editing a public API, read the selected row in `docs/PLAN.md` and its `docs/delivery/VS-NNN-*.md` file. The slice plan identifies the exact operations, models, authorization posture, validation, and failure states that may be advertised.

Keep TypeSpec organized by stable product/domain boundary, not by temporary plan folder. A slice references the relevant `.tsp` source and operation names; it does not duplicate contract definitions in Markdown.

Edit the `.tsp` files, then run:

```bash
pnpm contract:build
```

TypeSpec emits `contracts/generated/openapi.yaml`, then `openapi-typescript` emits `apps/web/src/shared/api/generated/openapi.ts`. Both generated artifacts are committed so contract drift is visible in review and clean-checkout builds do not depend on an implicit generation step.

Run `pnpm generate` after editing TypeSpec and `pnpm check:generated` before review. Do not hand-edit either generated file. The request wrapper remains intentionally small and handwritten; it consumes generated schema types rather than duplicating them.

A slice is `CONTRACT_READY` only when:

- its TypeSpec operation set compiles;
- generated OpenAPI has been reviewed against the slice acceptance matrix;
- the backend agent records the initial checkpoint and the frontend agent completes its consumer review;
- an accepted checkpoint is recorded after every slice-local request is applied, declined with evidence, or resolved through the human gate;
- authentication, authorization, validation, nullability, enums, cookies, and required errors are explicit;
- the contract does not advertise adjacent future behavior;
- backend/frontend implementation may proceed without unresolved product-semantic questions.

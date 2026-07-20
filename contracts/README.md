# API contracts

Edit the `.tsp` files, then run:

```bash
pnpm contract:build
```

TypeSpec emits `contracts/generated/openapi.yaml`, then `openapi-typescript` emits `apps/web/src/shared/api/generated/openapi.ts`. Both generated artifacts are committed so contract drift is visible in review and clean-checkout builds do not depend on an implicit generation step.

Run `pnpm generate` after editing TypeSpec and `pnpm check:generated` before review. Do not hand-edit either generated file. The request wrapper remains intentionally small and handwritten; it consumes generated schema types rather than duplicating them.

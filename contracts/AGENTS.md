# Contract agent rules

- TypeSpec is the only hand-edited public HTTP contract.
- Before adding or changing an operation, read the accepted `docs/delivery/VS-NNN-*.md`; do not advertise behavior outside that slice.
- Keep operations resource-oriented and versioned under `/api/v1`.
- Declare authentication, validation constraints, nullability, enum values, and error responses explicitly.
- Reuse shared models; do not create near-identical request/response types.
- Update backend and frontend implementations in the same change; generated OpenAPI alone does not prove conformance.
- Run `pnpm contract:build` after every change.
- Never edit `generated/openapi.yaml` manually.

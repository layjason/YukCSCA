# Contract agent rules

- Inherit the repository-wide contract in [`../AGENTS.md`](../AGENTS.md).
- TypeSpec is the only hand-edited public HTTP contract.
- Before adding or changing an operation, read the accepted `docs/delivery/VS-NNN-*.md`; do not advertise behavior outside that slice.
- The backend agent owns the slice contract: initialize TypeSpec after resolving its human gate, then accept, decline, or escalate frontend `CR-NN` requests in the active slice.
- Mark the slice `CONTRACT_READY` only when TypeSpec compiles, generated output and frontend consumer needs are reviewed, and no request remains unresolved.
- Keep operations resource-oriented and versioned under `/api/v1`.
- Declare authentication, validation constraints, nullability, enum values, and error responses explicitly.
- Reuse shared models; do not create near-identical request/response types.
- After `CONTRACT_READY`, backend and frontend implementations may proceed separately from the same slice revision and contract checkpoint; integrate and verify them before `DONE`.
- Run `pnpm contract:build` after every change.
- Never edit `generated/openapi.yaml` manually.

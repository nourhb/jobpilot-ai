# workers/

Phase 8: BullMQ processors live in `processors.ts`. The worker *process*
entrypoint is `src/worker.ts`.

Section 41's finer-grained workers (CoverLetter / Validation /
Submission / Verification) are not separate processes -- they are
stages inside `application.service.ts` (Phase 6) so there is never an
`LLM -> Submit` hop across a queue boundary. `processApplication`
always calls `createAndProcess`, which still runs Validator + Policy
Engine before any adapter `submit()`.

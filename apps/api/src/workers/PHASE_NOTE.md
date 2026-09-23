# workers/

Reserved for individual BullMQ queue processors (JobDiscoveryWorker,
MatchWorker, CoverLetterWorker, ApplicationPreparationWorker,
ValidationWorker, SubmissionWorker, VerificationWorker — see
docs/architecture.md, "Workers"). All must be idempotent (Cursor rule
#13). The generic worker *process* entrypoint already exists at
`src/worker.ts`; the actual queue consumers are added in **Phase 8**
alongside BullMQ/Redis queue definitions.

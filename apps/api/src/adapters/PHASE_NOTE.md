# adapters/

API-side wiring of `packages/source-adapters`. `registry.ts` (Phase 3)
wires up the MOCK adapter so the discovery pipeline has something to
run against; Greenhouse, Lever, Ashby, and Workable are registered here
too, one at a time, as they're implemented in **Phase 7**.

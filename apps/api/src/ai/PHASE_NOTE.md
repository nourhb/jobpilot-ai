# ai/

Reserved for API-side usage of `packages/ai` (resume parsing prompts,
job matcher, cover-letter writer, fact checker, question-answer engine).
The provider abstraction + MockProvider already exist in
`packages/ai/src/providers`; the resume parser lands in **Phase 2**, and
matching/cover-letters/fact-checking in **Phase 4/5**.

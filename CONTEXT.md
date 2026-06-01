# Proxima Landing

Marketing site and logged-in app for Proxima Fitness — AI workout program builder, program vault, and training tools.

## Language

**Arrival**:
How the user landed on `/build-program` (URL params + navigation source). Determines program hydration and chat session bootstrap.
_Avoid_: Entry point (ambiguous), route, landing

**Dispatch**:
An event that calls the LLM send path (`sendMessageWithContext`). May happen zero or more times after an arrival.
_Avoid_: Entry point (ambiguous), trigger (too generic)

**ChatEntryPlan**:
Pure config returned by `resolveChatEntryPlan` — history bootstrap, auto-send policy, shell stability, session-on-first-send rules for one arrival + runtime snapshot.
_Avoid_: Chat state, session config, entry point

**Chat navigation**:
User intentionally opens a different chat context — sidebar recent row, or home prompt with pre-minted `?chat=` already in the arrival URL. May remount the program-builder shell and reset program hydration for that context.
_Avoid_: Entry point, route change (too broad)

**Arrival intent**:
Whether the current `/build-program` session started as chat navigation (`?chat=` already in the arrival URL or sidebar row selected). Distinct from session mint updating `?chat=` later; mint must not change shell key or re-trigger program hydrate.
_Avoid_: Initial state, URL params (too implementation-shaped)

**Session mint**:
First-send bookkeeping that writes `?chat=` to the URL after insert-on-send. Not chat navigation; shell and program hydrate must stay stable through the in-flight send turn.
_Avoid_: URL update, chat creation (implementation)

**Empty program template**:
The pre-seeded `emptyHevyProgram` grid shown when the user explicitly starts a blank program. Allowed only for New Chat (`?empty=true`) and bare `/build-program` redirect — not for home prompt (`?search=`) or other dispatch arrivals.
_Avoid_: Empty grid (ambiguous — an empty grid may be correct without the template)

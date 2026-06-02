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

**Sign-in migration**:
Post-arrival auth orchestration (derived bootstrap + `useMutation`, no new effects) that persists an anonymous thread from `CHAT_MESSAGES_KEY` (or in-memory messages) to Supabase, assigns `?chat=`, and clears anon localStorage. Behaves like session mint for shell/hydrate — not chat navigation.
_Avoid_: Auth transition (too broad), login flow

**Program builder New mode**:
Building a fresh program on `/build-program` without `edit=true` in the arrival URL. Primary CTA is **Export** (no toolbar Save). Persisting the program to the profile and **chat-program connection** happen as part of a successful export flow (Hevy first; other export destinations later).
_Avoid_: New chat (that is a sidebar action), create mode

**Program builder Edit mode**:
Editing an already-saved program (`edit=true` and integration flag, e.g. `hevy=true`). Primary CTA is **Sync/Save** — push changes to the integrated app and write a new program version to the DB. Out of scope for chat-history v1.
_Avoid_: Edit exercise (grid UI), modify mode

**Implicit save (New mode)**:
Persisting the program to `programs` (and subscriber) without a separate Save button — triggered by export, not a standalone Save action.
_Avoid_: Auto-save, background save

**Chat-program connection**:
Associating a saved program with a chat row by setting `program_id` on the chat. In **New mode**, runs after implicit save on export when a chat session exists (persist chat id from URL or session mint). Optional — export/save to profile does not require chat. **Edit mode** connect policy deferred.
_Avoid_: Link chat to program (reversed direction), save chat

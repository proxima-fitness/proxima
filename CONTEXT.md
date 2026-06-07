# Proxima Landing

Marketing site and logged-in app for Proxima Fitness — AI workout program builder, program vault, and training tools.

## Language

**Integrated training coach**:
Proxima's product role on the web — an AI agent that builds and advises on workout programs inside the builder (`/build-program`), not a separate mobile app or static marketing site. The home page (`/`) exists to start **New arrival**; ongoing coaching happens in the builder.
_Avoid_: Personal trainer app, Proxima app (deprecated marketing surface), landing page product

**Arrival**:
How the user landed on `/build-program` (URL params + navigation source). Determines program hydration and chat session bootstrap.
_Avoid_: Entry point (ambiguous), route, landing

**New arrival**:
Entering the builder to create a program — typically from the home prompt with a `search=` dispatch (attachments optional). Homepage primary conversion. Distinct from Edit arrival, `?empty=true`, bare `/build-program` redirect, and chat navigation.
_Avoid_: Build program, home prompt (implementation-shaped)

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

**Chat-program connection**:
Associating a saved program with a chat row by setting `program_id` on the chat. Triggered only on explicit Save when a chat session exists (`?chat=`); optional — program Save does not require chat.
_Avoid_: Link chat to program (reversed direction), save chat

**Hevy program (edit scope)**:
One Hevy routine folder and all routines inside it — the unit loaded from the dashboard grid and synced back in Edit mode. Not the builder's multi-week grid; weeks are a Proxima layout layer only.
_Avoid_: Program (ambiguous with Supabase program), folder (ambiguous)

**Hevy routine folder ID**:
Stable Hevy-side identifier for the routine folder a program lives in. Persisted when entering Edit mode; used as the POST target for new routines on Sync. Distinct from week index in the builder.
_Avoid_: folder_id (overloaded in code today), week folder

**Week index**:
Builder-only 0-based slot for which week a day belongs to in the program grid. Stored as `weekIndex` on builder routines (replacing overloaded `folder_id`). Must not be confused with initial folder ID or Hevy routine folder ID.
_Avoid_: folder_id, week number (1-based ambiguity)

**Hevy routine ID**:
Stable Hevy-side UUID for one routine (one day). Set when a routine is loaded from the Hevy API or returned from a POST on Sync. Used for PUT and empty-on-remove. Stored as `hevyRoutineId`, separate from the builder routine key.
_Avoid_: id (ambiguous with dnd key), day id

**Builder routine key**:
Client-only integer identifier on a day in builder state (`id`), assigned sequentially for dnd and React keys in both New and Edit mode. Never sent to Hevy. New days and copies get the next integer; duplicates and copies do not inherit a Hevy routine ID.
_Avoid_: id (when meaning Hevy), routine id (ambiguous), UUID dnd key

**Sync (Edit mode)**:
Push builder changes to the user's existing Hevy program — empty removed routines (PUT, no exercises), PUT updated ones, POST new ones. Each operation retries with exponential backoff on rate limits (same spirit as Export upload). Continue through the batch when one operation exhausts retries; log and toast failures. Do not abort the whole batch on first error.
_Avoid_: Export (New mode only), upload, DELETE

**Sync completion (Edit mode)**:
After Sync finishes with zero failed operations, show a success toast, invalidate the `useHevyPrograms` React Query cache, then navigate. Toolbar Sync goes to the profile page. Leave-guard **Save and Continue** goes to the user's original destination. The builder is not refreshed in place — the next Edit entry loads fresh routines from a refetched profile fetch.
_Avoid_: Post-sync cache, keep local state, in-builder reload, confetti

**Sync dialog**:
Dedicated `SyncDialog` for Edit mode — confirmation with empty / update / add counts, inline progress with rate-limit retry (same pattern as Export), and **Rollback to previous version** when operations fail. Leave-guard **Save and Continue** opens the same dialog in progress-only mode (counts already shown in the leave dialog). Toolbar Sync uses the full confirm step first.
_Avoid_: Export dialog, save dialog

**Sync pipeline**:
Single Sync implementation used by the toolbar Sync button and by the leave-guard **Save and Continue** action. Same diff, batch order, progress UI, and retry behaviour. Proxima custom exercises are resolved the same way as Export before PUT and POST operations.
_Avoid_: saveAndContinueSync, duplicate sync paths

**Sync batch order**:
Order of Hevy API calls during Sync: empty removed routines first, PUT updated routines second, POST new routines last.
_Avoid_: Diff order, sync pipeline

**Changed routine (Sync)**:
A builder routine with a Hevy routine ID whose content differs from the matching entry in `initialHevyProgram`. Only changed routines receive PUT on Sync; unchanged routines are skipped.
_Avoid_: Updated routine (too vague), dirty routine

**New routine (Sync)**:
A builder routine with no Hevy routine ID. POST to Hevy on Sync, including when the day has zero exercises — an empty routine without the `[Removed]` prefix is a day still being built, not a removal.
_Avoid_: Added day, local routine

**Removed routine (Sync)**:
A routine whose Hevy routine ID is in `initialRoutineIds` but no longer appears in builder state. Sync clears it in Hevy via PUT — update title and remove all exercises. Hevy API does not support DELETE on routines.
_Avoid_: Orphan, deleted day (ambiguous with UI action), hard delete

**Emptied routine (Hevy)**:
A routine left in the Hevy folder with no exercises after Sync removed it from the builder program. Title set to `[Removed]` plus the original title (any existing `[Removed]` prefix stripped first). Skip the empty PUT when Hevy already matches that state. The prefix is the sole signal for an emptied routine — an exercise-less routine without the prefix may be a day the user is still building.
_Avoid_: Deleted routine, archived folder, empty routine

**Removed routine filter**:
On Edit load from Hevy, routines whose title starts with `[Removed]` are excluded from the builder, from `initialHevyProgram`, and from `initialRoutineIds`. Active routines only. Same filter after a successful Sync when snapshots are refreshed.
_Avoid_: Empty exercise filter, hide deleted

**Initial routine IDs**:
Snapshot of Hevy routine IDs for active (non-`[Removed]`) routines when Edit mode opens. Used on Sync to detect removed routines (empty via PUT). Held in builder session state for the current Edit session only; absent in New mode.
_Avoid_: baselineHevyRoutineIds, editSession

**Initial Hevy program**:
Full routine snapshot of active (non-`[Removed]`) routines fetched from Hevy when Edit mode opens — the pre-edit truth. `[Removed]`-tagged routines are stripped before capture. Held in session memory alongside working builder state. Used for Sync rollback. Refreshed after successful Sync with the same filter. Not persisted via `hevy-program-in-progress`; not used for resume.
_Avoid_: hevy-program-in-progress (Edit path), backup file, raw folder pull

**Edit session**:
An in-progress Edit-mode builder load tied to one Hevy program (edit scope). Hevy account is source of truth for v1; Supabase program vault is not updated on Sync. Session state (`initialHevyProgram`, `initialRoutineIds`, `initialFolderId`, working routines, edit dirty state) lives in an `EditSessionProvider` while Edit arrival is active.
_Avoid_: Draft (ambiguous with New-mode localStorage draft), edit state

**Builder draft**:
The in-progress program persisted in `hevy-program-in-progress` for resume in New mode only. Edit mode does not read or write this key — edit state lives in memory for the session.
_Avoid_: Edit session payload, New draft vs Edit draft

**Edit navigation guard**:
When the user has unsaved Edit-mode changes and tries to leave the builder — including switching New ↔ Edit in the mode menu — block in-app navigation and show a dialog with a Sync change summary (empty / update / add counts), **Save and Continue** (run Sync progress immediately, then navigate to the user's original destination on success), **Discard** (drop local changes and navigate without touching Hevy or invalidating cached profile data), and **Cancel** (stay in builder). Implemented via `useEditLeaveGuard()` (`beforeunload` + `guardNavigation()` on documented exit points: sidebar, breadcrumbs, mode menu, etc.). Tab close or refresh uses the browser `beforeunload` prompt when dirty; it cannot offer Sync. Edit mode never resumes from `hevy-program-in-progress`; the next Edit entry always loads from the profile routines fetch.
_Avoid_: Unsaved changes warning (too generic)

**Initial folder ID**:
The Hevy routine folder ID captured when the user opens a Hevy program for editing. Used as the POST target for new routines on Sync. Held in builder session state (not persisted for Edit resume); distinct from week index on each routine.
_Avoid_: hevyRoutineFolderId, folder_id (week index)

**Sync rollback**:
Restore the user's Hevy account to the initial Hevy program after a failed or partial Sync. Diff current Hevy state against the initial snapshot; reverse changes surgically — PUT restored routines, POST routines that were emptied, empty routines that were created during the failed Sync. Each rollback operation retries with exponential backoff until complete (same discipline as Export upload). User-triggered only via **Rollback to previous version** in the Sync progress UI when one or more Sync operations failed. After a successful rollback, invalidate `useHevyPrograms` and navigate to the profile page.
_Avoid_: Undo, revert changes, re-POST duplicates, DELETE, in-builder reload

**Hevy reload (Edit mode)**:
After a successful Sync, invalidate `useHevyPrograms` and leave the builder for the profile page. After a successful rollback, same pattern. Edit entry loads routines passed from the profile fetch — not from `hevy-program-in-progress`.
_Avoid_: Baseline advance, in-builder reload, resume draft

**Edit arrival**:
Entering the builder to modify an existing Hevy program — via `/build-program?edit=true&hevy=true&folder={initialFolderId}`. On Edit click from the profile (My Hevy Programs grid or blind-spot Hevy program picker), refetch `useHevyPrograms`, then pass the selected program's routines through router navigation state. Optional query params (e.g. `search=` for stall-analysis dispatch) compose with Edit arrival. The build-program page hydrates from navigation state and does not fetch routines on mount. If navigation state is missing (refresh, direct URL), redirect to the profile page. Not seeded through `localStorage`.
_Avoid_: Resume, hevy-program-in-progress (Edit path), build-program fetch

**Edit mode menu**:
The breadcrumb New/Edit switch. Edit is only selectable when the builder is already on an Edit arrival (`folder` param present). Entering Edit from New is via My Hevy Programs on the dashboard, not the mode menu.
_Avoid_: Mode toggle, program picker

**Edit agent**:
The chat agent has the same program-building tools in Edit mode as in New mode. Agent mutations update working builder state and set edit dirty state; the user Syncs to push changes to Hevy.
_Avoid_: Read-only chat, constrained edit tools

**Edit dirty state**:
Whether the current Edit session has unsaved builder changes. Set by any mutation (grid edit, agent patch, undo); cleared on successful Sync, Discard, or fresh Hevy load. Drives the navigation guard. Page refresh shows a browser `beforeunload` warning when dirty; if the user proceeds, unsaved Edit state is lost and the next Edit entry reloads from Hevy.
_Avoid_: isDirty (implementation), unsaved flag

**Program versioning**:
Future capability to track Proxima/Supabase program history over time. Out of scope for v1 Edit Sync; deferred until Hevy-only Sync is stable.
_Avoid_: Save, sync

**Hevy sync module**:
Edit-mode Sync and rollback logic lives in `hevy_sync.ts` with colocated tests. `hevy.ts` retains HTTP primitives (`putRoutine`, `postRoutine`, `defaultPut`, etc.).
_Avoid_: syncProgramToHevy in hevy.ts, export sync

**Edit navigation hook**:
Shared `useNavigateToEditHevyProgram()` used by profile entry points (My Hevy Programs grid, blind-spot Hevy picker). Refetches `useHevyPrograms`, passes routines via router state, and navigates to Edit arrival with `folder` and optional extra query params.
_Avoid_: navigateToEditHevyProgram helper, inline edit push

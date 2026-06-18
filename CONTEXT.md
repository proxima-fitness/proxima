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

**Template swap**:
Replacing one exercise template with another across some or all days and weeks of a program — e.g. barbell → dumbbell for every occurrence. Preserves existing sets and rest when the swap is equipment-only; distinct from editing a single slot’s prescription (reps, RPE, rest) or replacing one day’s exercise with new set targets.
_Avoid_: Exercise edit (ambiguous — may mean one slot or program-wide), variation change (too vague)

**Program mutation batch**:
One ordered set of program changes the agent applies atomically in a single turn for one logical edit. Fail-all: if any change is invalid, none apply.
_Avoid_: Patch, JSON edit

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

**Constraint profile**:
Merged training constraints for one builder session — home-prompt inference plus questionnaire answers plus later chat refinements. Authoritative for exercise selection and program edits; agent must not re-ask fields already captured here. Chat may add or override; it does not erase prior answers unless the user explicitly changes them.
_Avoid_: User preferences (too broad), questionnaire data (implementation-shaped), builder state

**Equipment constraint**:
Hybrid equipment rule within the constraint profile: excluded equipment types (questionnaire) plus explicitly available equipment (home prompt, chat). Exercise selection must satisfy both — excluded types out, available types in. Distinct from a single "cables only" label; captures setups like cable machine plus bench attachments.
_Avoid_: Exclude equipment (exclusion half only), gear list (too informal)

**Available equipment**:
Positive half of the equipment constraint — what the user explicitly has (e.g. cable machine, adjustable bench, attachments). Merged from home prompt and chat into the constraint profile. Complements excluded equipment from the questionnaire; both apply together.
_Avoid_: Allowed gear (informal), equipment list (ambiguous with full Hevy catalog)

**Movement restriction**:
A constraint on how or where the user can train — e.g. no floor work, no kneeling, no single-leg exercises, avoid overhead with impingement. Lives in the constraint profile (health issues, chat refinements). Distinct from equipment constraint and from muscle-area exclusions.
_Avoid_: Limitation (ambiguous with load/volume), injury (health issue may imply restrictions but is not the same term)

**Restriction tag**:
Canonical machine-readable flag for a movement restriction (e.g. no floor, no kneeling, no unilateral). Derived from the constraint profile; used in a later enforcement slice to filter exercise candidates. Prompt and skills honor the plain-language source first; tags tighten tool-level filtering when present.
_Avoid_: Movement flag (too implementation-shaped), exclusion tag (ambiguous with equipment)

**Exercise objection**:
User pushback on one programmed movement — pain, equipment mismatch, can't perform position (e.g. kneeling), wrong stimulus. Agent treats as replace-in-place on that slot, not removal. Distinct from explicit "remove/skip this exercise" and from program-wide filters (e.g. no single-leg across all days).
_Avoid_: Complaint (too informal), exercise feedback (too broad)

**Questionnaire gate**:
Required `getMoreInfoQuestions` step before first `planProgram` / `buildWeek` on a new program. Collects structured prefs; merges into the constraint profile with home-prompt inference. After the user submits or says "Build my program", the agent must not ask again in chat for fields already captured — proceed to build using the profile.
_Avoid_: Intake form (UI-shaped), pre-build questions (too vague)

**Hevy workout history**:
The user's completed Hevy workouts — full logs (title, timestamps, exercises, sets). Canonical copy lives in Proxima's workout history backup after sync; agent and Blind Spot read from there, not live Hevy per request. Distinct from Hevy's per-exercise history API and from program workout days in the builder.
_Avoid_: Exercise history (Hevy API term — derived view)

**Workout history backup**:
Proxima's stored copy of a user's completed workouts, synced from connected fitness apps. Full backfill runs in the background when Hevy is first connected (all tiers — pre-stages data before Pro); connect dialog closes immediately. Ongoing sync uses workout-count delta for new workouts, **backed-up workout revision** when Hevy reports a newer version of an existing workout, plus on-demand refresh when Blind Spot or the agent reads history. Canonical shape: workout → exercises → sets. Supersedes legacy `workout_history` / `workout_history_exercises` tables, which are removed once canonical storage ships.
_Avoid_: Hevy sync (implementation), exercise_history backup (wrong grain), blocking connect flow

**Backed-up workout revision**:
Re-sync of one existing backup **Workout** when the connected app reports a newer version of the same external workout ID (e.g. user edited sets or title in Hevy after initial import). Runs during ongoing workout history backup — not a separate user action. Bounded to recent history on routine sync; older edits rely on **Workout history fresh sync**. Distinct from count-based delta, which only detects net-new workouts.
_Avoid_: Upsert (implementation), workout edit (ambiguous with builder Sync)

**Workout history fresh sync**:
User-initiated full reset of one user's **Workout history backup** — wipe all backed-up **Workouts** for that user, then re-run full Hevy backfill from scratch. Escape hatch when bounded revision window is insufficient (e.g. user edited a workout older than recent history). Requires explicit confirmation; destructive to Proxima backup only — does not modify the Hevy account.
_Avoid_: Re-sync (ambiguous with revision), clear cache (implementation)

**Workout** (backup):
One completed workout in the workout history backup — what the user actually performed, with exercises and sets. Optional **description** (workout-level notes from the source app). Identified by app source + external ID for dedup on sync. Not a builder routine/day, not a chat session, not a scheduled program day.
_Avoid_: Session (use workout), workout log (deprecated term), program day

**Workout exercise**:
One exercise performed within a backup workout — ordered rows linking to a canonical exercise. May include logged **notes** and **superset_id** from the source app (for display in workout history browse). Distinct from canonical exercises, builder slots, and Hevy exercise templates.
_Avoid_: Exercise (ambiguous — specify canonical, builder, or workout exercise)

**Set** (backup):
One logged set within a workout exercise — weight, reps, RPE, duration, distance, set type, etc. Normalized columns, not app-native JSON.
_Avoid_: Builder set (prescription), program set (planned)

**Canonical exercise**:
Cross-app movement identity in Proxima — name, muscles, equipment. **Global canonical** rows (`user_id` null) include the shared Hevy library seed and **Proxima supplemental** customs — readable by all authenticated users. Distinct from **Custom movement** (user-owned, `user_id` set, RLS-gated).
_Avoid_: Catalog exercise (deprecated term), Hevy exercise template (app-specific), workout exercise (instance in a logged workout)

**Proxima supplemental**:
Shared custom exercises Proxima added to the exercise library (e.g. warmup templates) — flagged `is_proxima_supplemental` on the template mirror. Stored as global canonical rows (`user_id` null). Readable by all users. Distinct from **Custom movement** (one user's Hevy app creation).
_Avoid_: Warmup exercise (examples only), export custom (process not identity)

**Custom movement**:
User-owned exercise identity — created in the user's Hevy app (**Hevy-native custom**) or minted on that account when exporting a non-supplemental custom (**Proxima-exported custom** with a per-account Hevy ID). Stored as `canonical_exercises` with `user_id` set. RLS: readable only by that user. Distinct from **Proxima supplemental** (shared, `user_id` null).
_Avoid_: Custom exercise (ambiguous with Hevy template object), user exercise (too generic)

**Exercise source mapping**:
Link from an app-specific exercise ID (e.g. Hevy template UUID) to a canonical exercise. One canonical exercise may have many mappings across sources. Used when importing workout history from connected apps. Canonical exercises are seeded from Hevy templates deduped by `normalized_title`; new templates get a lazy mapping on first sync if missing.
_Avoid_: Exercise FK (implementation), template id (Hevy-shaped), catalog (deprecated term)

**Blind spot analysis**:
Profile feature that surfaces exercises where logged performance has stalled or regressed, and routes the user into the builder to fix plateaus. Reads the workout history backup (not live Hevy). Free tier: limited preview (last 15 performances per exercise); Pro: full synced history for analysis, trends, and stall dispatch. Pro-gated for depth, not for backup sync itself.
_Avoid_: Stall detection (implementation), exercise stalls (UI component name)

**Workout history browse**:
Profile **Recent Workouts** section — horizontal feed of backed-up **Workouts** as read-only logged day cards (title, date, duration; up to 5 exercises per preview card). **See more exercises** opens **Logged workout detail** when a workout has more than five exercises. Free for all Hevy-connected users; cursor-paginated load-more over full synced history. Page refetches as backfill adds rows. Validates the backup read path before blind spot analysis ships. Distinct from blind spot analysis (stall detection) and from profile statistics (weekly aggregates). Placement and card shell per profile Hevy layout ADR.
_Avoid_: Workout history (ambiguous with backup or Hevy API), exercise history (Hevy API grain), sync banner (progress only)

**Logged workout detail**:
Full read-only view of one backed-up **Workout** at `/workout/{id}` (`{id}` = Proxima backup UUID). Metadata block (title, date, duration, source badge, exercise/set counts, back to profile) plus full logged day card with all exercises and sets. Profile card shell on muted background; dedicated 404 when missing or not owned. Distinct from workout history browse (5-exercise preview cards on profile).
_Avoid_: Workout page (ambiguous with builder day), Hevy workout URL (external app)

**Workout history access**:
Reading backed-up workouts for product features (workout history browse, blind spot analysis, agent tool). Pro-gated for agent queries and full blind spot depth; backup sync, browse, and retention are free for all connected users so upgrade unlocks existing data immediately.
_Avoid_: Hevy API access (live fetch), export (program push to Hevy)

**Agent workout history tool**:
Pro-only chat tool that returns recent backed-up workouts from Supabase. Agent chooses how many workouts to pull (cap ~30). Optional filters by date or canonical exercise. Workout-scoped only in v1 — no separate exercise-history tool.
_Avoid_: getExerciseHistory (v1 scope), live Hevy fetch in chat

**Profile statistics**:
Hevy-style aggregate chart on the profile page — weekly Duration, Reps, and Volume totals derived from the workout history backup, with a time-range filter (last 4 weeks or last 12 weeks). Headline above the chart always shows the current Sun–Sat week total for the active tab (Duration, Reps, or Volume), independent of the chart range. Duration uses workout wall time (`ended_at − started_at` per workout, summed by week). Reps uses total reps across all sets in each week (null reps excluded). Volume uses the sum of `weight_kg × reps` per set in each week (null reps excluded; zero or null weight contributes 0 — same rule as blind spot session volume). Volume is stored in kg; the UI shows the user's preferred weight unit. Weeks bucket by `started_at` using Sunday-start calendar weeks (US convention). Free for all users with Hevy connected and backup data — not Pro-gated. Distinct from blind spot analysis (per-exercise stall detection) and from the header workout count (lifetime total).
_Avoid_: Workout stats (ambiguous with header count), activity chart (too generic)

**Profile calendar**:
Month grid beside **Profile statistics** on the profile Stats tab (Sunday-start week row, US convention — same as profile statistics) — one highlighted day per calendar date that has at least one backed-up **Workout**, using the same local workout date shown on workout history browse cards (workout start, not finish). One highlight per day regardless of how many workouts that day. User can navigate to any month across full synced backup history (independent of profile statistics’ 4/12-week chart range); highlights load per visible month and refill silently as backup sync adds workouts (no sync status copy on the calendar card). Month navigation is unbounded — empty grids before the first workout or after today are allowed; future months show no highlights. Hovering, focusing, or tapping a highlighted day opens the same tooltip (tap-to-open on touch; dismiss on outside tap) listing each backed-up **Workout** that day — title, duration, date, and a **See Workout** link to **Logged workout detail** — stacked when multiple sessions share a date. Opens on the current calendar month by default. Free for all Hevy-connected users with backup data (not Pro-gated). Shown only when Hevy is connected (same gate as **Recent workouts**). Distinct from profile statistics (weekly Duration/Reps/Volume aggregates).
_Avoid_: Activity calendar (too generic), workout calendar (ambiguous with builder schedule)

**Profile header**:
Top identity block on the profile page — avatar, @username (primary), display name (secondary), bio, Edit profile, and stat row (Workouts, Followers, Following). Stat row uses Hevy layout: label above number. Workouts stat folds in backup sync state (count when caught up; fraction + status dot when syncing/paused/error; inline pause/play icon when syncing or paused). Hevy-parity layout; no photo banner.
_Avoid_: Profile hero (implementation component name), user card (too generic)

**Recent workouts** (profile):
Horizontal browse feed on the profile page — read-only preview cards for backed-up **Workouts** (≤5 exercises each), newest first, cursor-paginated with load-more. Card header shows title, date, and duration. **See more exercises** links to logged workout detail when needed. Shown only when Hevy is connected. Sits after profile statistics and before My Hevy Programs. White card on muted page background per profile Hevy layout.
_Avoid_: Workout feed (ambiguous with social feed), workout history list (too generic)

## Legal & privacy

**Legal acceptance**:
Required confirmation that the user has read and agrees to the current **Terms of Use** and **Privacy Policy** versions. All authenticated users must accept when their stored versions are behind the published versions. Email **sign-up** collects required acceptance and writes `user_consents` at registration; the **Legal acceptance dialog** is the safety net for OAuth first-timers, legacy users without a row, and future version bumps. Enforced by an unclosable client dialog over the app until accepted — not by API route locks in v1. No row or stale version = blocked. Prior browsewrap acceptance does not satisfy the gate.
_Avoid_: Terms checkbox (implementation), browsewrap acceptance (deprecated pattern), API consent middleware (v1 out of scope)

**Policy version**:
Published revision of Terms of Use or Privacy Policy, stored in Supabase (`policy_versions`). Each row is one release of one document type. The app fetches the current version per type — no hardcoded version constants in code. Bumping either version forces **Legal acceptance** for users whose `user_consents` FKs point at older rows.
_Avoid_: Last updated date (display-only), legal_version (bundled single ID)

**Policy version registry**:
Supabase table holding metadata for each published Terms and Privacy revision (document type, version label, effective date). `user_consents` FKs reference the specific `policy_versions` rows the user accepted. **Current version** = latest row per document type where `effective_at <= now()`. Legal prose lives on static app routes (`/terms-of-use`, `/privacy`); the registry is for gating and audit only.
_Avoid_: CURRENT_TERMS_VERSION constants, version strings in application code, storing full legal text in Postgres (v1)

**Data deletion request**:
User-initiated request to erase all personal data Proxima holds, without necessarily closing the account. Distinct from **Account deletion** (which also removes the auth identity). v1: policy + email to Proxima support (`jack@proximafitness.com`); no in-app request flow or ticket table.
_Avoid_: GDPR request (jurisdiction-specific label), forget me (informal), self-serve partial wipe (v1 out of scope)

**Account deletion**:
Permanent removal of the user's auth identity and all associated personal data in Proxima. Available from account settings; policy states this erases workout history backup, programs, profile, and integrations.
_Avoid_: Deactivate (ambiguous — may imply recoverable), unsubscribe (email-only)

**Platform improvement consent**:
Optional opt-in allowing Proxima to use the user's workout history backup, programs, builder usage, coaching chats, and **service analytics** (PostHog, Google Analytics) to improve the product and services — aggregated or de-identified where feasible. PostHog and Google Analytics are disclosed together in Privacy Policy and controlled by this single toggle (not a separate analytics consent). Not used for marketing, third-party sale, or ad targeting. v1: store preference and disclose in policy only — **do not** gate PostHog/GA capture or other pipelines on the flag yet (deferred follow-up). Revocable on **Privacy settings**.
_Avoid_: Analytics consent (separate toggle), research opt-in (subset only), anonymous-only aggregates (v1 scope is broader), operational analytics carve-out (PostHog is in-scope)

**Legal acceptance dialog**:
Unclosable modal shown over the authenticated app when **Legal acceptance** is required. No dismiss, backdrop click, or Escape. Contains: policy summary, required agreement checkbox with links to Terms and Privacy (open in new tab), Accept button, and footer actions Log out and Delete account.
_Avoid_: Browsewrap banner, dismissible update toast

**Marketing consent**:
Optional opt-in to receive promotional emails and offers from Proxima. Not required for account or product use; default off until explicitly opted in. Collected at sign-up and editable on the dedicated Privacy settings page — not re-prompted on every sign-in.
_Avoid_: Newsletter signup (too narrow), notifications (in-app vs email)

**Privacy settings**:
Dedicated account page reachable from the sidebar account menu. Hosts revocable **Platform improvement consent** and **Marketing consent** toggles. Distinct from Edit profile (identity fields) and from the **Legal acceptance dialog** (required policy gate).
_Avoid_: Profile preferences card, settings (too generic)

**User consents**:
Single per-user record in Supabase (`user_consents`) holding **Legal acceptance** (FKs to `policy_versions` for Terms and Privacy), **Platform improvement consent**, and **Marketing consent**. One row per user; created on sign-up or first authenticated session. Audit timestamps: `legal_accepted_at`, `platform_improvement_opt_in_at`, `marketing_opt_in_at` (nullable when opted out). No append-only event log in v1.
_Avoid_: user_preferences (ambiguous with app prefs), legal_acceptances (too narrow), consent_events table (v1 out of scope)

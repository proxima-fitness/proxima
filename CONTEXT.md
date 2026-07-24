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

**Proxima program**:
The multi-week training block owned in Supabase — single source of truth on the **New path**. Has consecutive weeks, progress on the **Program overview**, and week-at-a-time **Week Export** to Hevy. Distinct from a **Hevy program (edit scope)**, which may exist with no Proxima program. Multiple active Proxima programs allowed in data; overview shows one via carousel.
_Avoid_: Overarching program, program-in-progress (UI-shaped), Program (alone — ambiguous with Hevy), vault program

**Program overview**:
Profile surface for **Proxima program** progress: consecutive weeks, **Week complete**, **AI week suggest**, **Edit program**, **Edit current week**. Export destinations removed from the builder (PDF, Hevy / **Week Export**, spreadsheet) live here as a per-program dropdown — not on the builder toolbar. Shows one program at a time; user swaps among active programs via a carousel. Sits above **Hevy folders** on the profile. Backend / **Hevy program sync** must support more than one active program even though the overview focuses one.
_Avoid_: Hevy folders (different section), vault browse, forcing a single active program in data, builder Export button

**Hevy folders**:
Profile grid of the user’s Hevy routine folders (formerly “My Hevy Programs”). Entry for Hevy-only **Edit path** / split builder — outside the preferred **Proxima program** loop. Kept below **Program overview** so power users can still Sync a folder without a program; **Make into a program** promotes into the preferred flow.
_Avoid_: My Hevy Programs, treating folders as Program overview, implying this is the primary path

**New path**:
Create and progress a **Proxima program**: build → **Save** to Supabase → Program overview → export via overview dropdown (**Week Export** to Hevy one week at a time; PDF / spreadsheet still available) → optional **AI week suggest** between weeks. No Export control on the program builder — all former builder export methods live only on the Program overview (profile). Not the **Edit path**.
_Avoid_: New mode (builder UI label), New arrival (entry mechanic only), Export-all-to-Hevy workflow, builder Export button

**Save** (New path):
Persist the builder’s full **Program prescription** to Supabase as the **Proxima program**. Clears dirty state and the undo stack so the current grid becomes the backed-up baseline. Does not push to Hevy. After Save, toast directs the user to profile to **Week Export** week 1 — no auto-navigation required.
_Avoid_: Sync (Edit-path Hevy push), Update program (Edit current week write-back), Export

**New-path leave guard**:
When the builder has unsaved **New path** prescription changes (dirty / undo stack) and the user tries to leave, block in-app navigation with **Discard** (wipe **Builder draft** / `hevy-program-in-progress` + related keys, then navigate) and **Cancel** (close dialog, stay on builder so they can press toolbar **Save**). No Save action inside the dialog. Tab close/refresh may use `beforeunload` when dirty. Does not trap browser back.
_Avoid_: Edit navigation guard (Sync-oriented), Save and Continue, autosave on leave

**Program–Hevy link**:
On each **Week Export**, after Hevy creates the week’s routine folder (and routines), Proxima persists that folder’s ID (and routine IDs) against the **Proxima program** + week index in Supabase. That row is the week’s **Hevy week copy** pointer — used for overview progress, read-only completed weeks, **Edit current week**, and **Hevy program sync**. Not title-only match.
_Avoid_: Title-only match as sole key, in-memory-only (must survive refresh), assuming Hevy folder id == week index

**Edit path**:
Modify training in the builder and push to Hevy via Sync. Two valid uses: (1) **Edit current week** of a **Proxima program**, or (2) edit a **Hevy program (edit scope)** with no Proxima program — a helpful split builder. Optional promote: **Make into a program**. Distinct from **New path**.
_Avoid_: Edit mode (UI label only), Edit arrival (entry mechanic), assuming every Edit implies a Proxima program, assuming Sync writes Supabase

**Edit current week**:
**Edit path** entry that loads only the Proxima program’s current week into the builder. User may open and **Sync** updates anytime while that week is the active **Hevy week copy** (exercise/weight/rep changes for days not yet done). Not a second **Week Export** — one folder per week; Sync updates the linked folder. Default persist is Sync to Hevy only; optional **Update program** writes the **Program prescription**.
_Avoid_: Edit mode (too broad), full-program Edit, re-Export same week, autosave to Supabase on Sync

**Current week** (overview):
The highest week number that exists as a Hevy routine folder for this **Proxima program** (via **Program–Hevy link** / `Week N - …` folders). Always the only Exported week that is not yet **Week complete** — **Week Export** of N+1 is blocked until week N is complete. **Edit current week** Sync updates that week’s routines (planned days). Completed sessions are **Workouts** in history — fix those via workout history, not by editing old routines. Stale completed-week folders in Hevy are the user’s to delete; Proxima does not clean them up.
_Avoid_: Calendar week, Syncing prior Exported weeks, Proxima deleting Hevy folders, editing routines to fix logged workouts
**Program prescription**:
What the **Proxima program** says the athlete should do — the trainer plan. Survives week-to-week; Export of week N+1 comes from this, not from last week’s Hevy divergences.
_Avoid_: Program (alone), plan (vague), template (ambiguous with exercise template)

**Week complete**:
Status on the Program overview that week N of a **Proxima program** is finished. User can tap **Mark week complete**, or the system auto-marks when every day in that week is recorded complete. Day completion is already tracked by **Hevy program sync** via Hevy `workout.routine_id` → folder title `Week N - {title}` → **program schedule history** (not title-fuzzy matching against backup). Unlock trigger for the next-week **AI week suggest** + **Week Export** of N+1.
_Avoid_: Program complete (whole block), Sync complete, exported (Export ≠ trained)

**Week Export**:
Push one week of a **Proxima program** to Hevy as a new routine folder plus that week’s routines. Creates the **Program–Hevy link** for that week. Week N+1 Export requires week N **Week complete**. Once linked, that week is not Exported again — further Hevy updates use **Edit current week** Sync until complete. Lives only on the **Program overview** Export dropdown (Hevy option) — not on the builder. Sibling dropdown options (PDF, spreadsheet) are non-Hevy full-prescription exports; they do not create a Program–Hevy link.
_Avoid_: Full-program Hevy Export (removed), Save (Supabase only), re-Export same week, Export N+1 while N incomplete
                       
**Hevy write quota**:
Renamed/replaced monthly full-program export limits. **Save** and in-Proxima prescription edits are unlimited. Meter charges every successful Hevy write: **Week Export**, **Edit current week** Sync, and Hevy-only **Edit path** Sync (no Proxima program). Week 1 **Week Export** per program is free; later Week Exports and all Syncs count. Tier numbers updated when the limit is renamed.
_Avoid_: Week Export quota (too narrow), charging for Save, Sync-free loophole via **Hevy folders**, “monthly exports” full-program wording

**Hevy program sync**:
Existing edge function (`hevy-program-sync`) that, on new Hevy workouts, marks schedule days complete via `workout.routine_id` and folder title parsing. Auto next-week upload and silent double-progression Hevy writes are **commented out** (not deleted) — reserved for a possible future auto-weight-progression mode; default loop pulls the user back to Proxima for **AI week suggest** + **Week Export** (retention). Needs rewiring so week-complete signals feed the Program overview.
_Avoid_: Workout history backup (different pipeline), Sync (Edit-path Hevy push), deleting the progression code

**AI week suggest**:
After **Week complete**, optional progression / exercise tweaks for week N+1. Generated **lazily** when the user opens the **Program overview** (or expands the suggest panel) — not on mark-complete and not on Export click. User may one-click apply into the **Program prescription** for week N+1, or skip and **Week Export** as-is. Distinct from **Edit current week** and from silent double-progression in **Hevy program sync**.
_Avoid_: Sync dialog summary, modifyProgram (tool), living-loop ad-hoc chat edit, eager cron generation

**Hevy week copy**:
What is currently in Hevy for a given exported week — the athlete’s working notes for that week, living in that week’s Export folder. Created by **Week Export**; updated by **Edit current week** Sync into that folder. May differ from the **Program prescription** without changing future weeks.
_Avoid_: Workout (backup) — those are logged completed sets; notes (ambiguous with set notes); active split

**Update program**:
Optional control on **Edit current week**. Off by default — Sync writes the **Hevy week copy** only. When checked, reveals a scope choice: **this week only** (rewrite that week’s slot in the **Program prescription**) or **all weeks** (apply the same change across the Proxima program). Never implied by Sync alone.
_Avoid_: Save (New-path persist), Sync (Hevy push), Make into a program (Hevy-only → Proxima program)

**Make into a program**:
Optional promote from a Hevy-only **Edit path** session. Switches into **New path** with the current split already loaded in the builder and runs the agent so it can expand/update that split into a full multi-week **Proxima program**. User then **Save**s as usual. Never required; Hevy-only Edit + Sync remains supported.
_Avoid_: Silent one-week Save, forced re-Export of week 1, Update program, convert-without-agent

**Hevy program (edit scope)**:
One Hevy routine folder and all routines inside it — the unit loaded from the dashboard grid and synced back on the **Edit path**. Not a multi-week **Proxima program**; weeks are a Proxima layout layer only. Informal “split” often means this when there is no Proxima program.
_Avoid_: Program (ambiguous with Proxima program), folder (ambiguous), Split (overloaded with questionnaire preferred-split / splitType)

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
Push builder changes to the user's existing Hevy program — empty removed routines (PUT, no exercises), PUT updated ones, POST new ones. Each operation retries with exponential backoff on rate limits (same spirit as Week Export upload). Continue through the batch when one operation exhausts retries; log and toast failures. Do not abort the whole batch on first error.
_Avoid_: Week Export (overview, New path), Save (Supabase prescription), upload, DELETE

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
An in-progress **Edit path** builder load tied to one **Hevy program (edit scope)** (and, on **Edit current week**, to one week of a **Proxima program**). Default Sync writes Hevy only — the **Hevy week copy**. Supabase **Program prescription** updates only when the user explicitly chooses **Update program**. When no Proxima program is attached, Hevy is the sole source of truth. Session state (`initialHevyProgram`, `initialRoutineIds`, `initialFolderId`, working routines, edit dirty state) lives in an `EditSessionProvider` while Edit arrival is active.
_Avoid_: Draft (ambiguous with New-path localStorage draft), edit state

**Builder draft**:
Local resume copy in `hevy-program-in-progress` for **unsaved** New-path work only (crash recovery, anon). Cleared on successful **Save**; after Save, Supabase **Proxima program** is SoT. Edit path does not read or write this key.
_Avoid_: Dual-write forever after Save, Edit session payload, treating draft as Program overview source

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
Entering the builder to modify an existing Hevy program — via `/build-program?edit=true&hevy=true&folder={initialFolderId}`. On Edit click from the profile (**Hevy folders** grid or blind-spot Hevy program picker), refetch `useHevyPrograms`, then pass the selected program's routines through router navigation state. Optional query params (e.g. `search=` for stall-analysis dispatch) compose with Edit arrival. The build-program page hydrates from navigation state and does not fetch routines on mount. If navigation state is missing (refresh, direct URL), redirect to the profile page. Not seeded through `localStorage`.
_Avoid_: Resume, hevy-program-in-progress (Edit path), build-program fetch

**Edit mode menu**:
The breadcrumb New/Edit switch. Edit is only selectable when the builder is already on an Edit arrival (`folder` param present). Entering Edit from New is via **Hevy folders** on the profile, not the mode menu.
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
History of a **Proxima program** over time in Supabase. Belongs to the **New path** / Program overview lifecycle (PRO-102 / PRO-176), not to Hevy-only **Edit path** Sync.
_Avoid_: Save (persist current), Sync (Hevy push)

**Hevy sync module**:
Edit-mode Sync and rollback logic lives in `hevy_sync.ts` with colocated tests. `hevy.ts` retains HTTP primitives (`putRoutine`, `postRoutine`, `defaultPut`, etc.).
_Avoid_: syncProgramToHevy in hevy.ts, export sync

**Edit navigation hook**:
Shared `useNavigateToEditHevyProgram()` used by profile entry points (**Hevy folders** grid, blind-spot Hevy picker). Refetches `useHevyPrograms`, passes routines via router state, and navigates to Edit arrival with `folder` and optional extra query params.
_Avoid_: navigateToEditHevyProgram helper, inline edit push

**Agentic memory**:
What the integrated training coach persists about the user across sessions and can use when coaching — inspectable and editable by the user on **Edit profile**. Edit-profile umbrella with subsections: **Constraint profile**, **Training profile** (structured person facts), and **Body measurements** (read from **Body measurements backup**, not freeform notes). Constraint profile and Training profile are separate user-scoped structured records; body measurement history is a separate backup like workouts. Prompt inject covers Active Constraint Profile, Active Training profile, and latest body measurement when present.
_Avoid_: Memories (implies freeform-only rows), agent knowledge (too vague), user preferences (too broad), folding person-facts into Constraint profile, stuffing body-measurement history into the Constraint profile row, Agent memory (use Training profile)

**Training profile**:
Agentic-memory kind for durable structured facts about the user that are not training constraints and are **not** covered by Hevy **Body measurement** fields. v1 fields: **age** (integer years, 14–100 — not date of birth), **sex** (male / female / prefer not to say — prefer-not-to-say and unset are the same empty value, not a third stored sex), **height**, experience level (beginner / novice / intermediate / advanced), physique phase (bulk / cut / maintain / recomp), **training focus**, activity level (sedentary / light / moderate / high / extreme — short forms, not questionnaire “light activity” labels), session duration cap (10–180 minutes in 10-minute steps). Height is stored canonical as centimeters; Questionnaire advanced and Edit profile use an **Imperial / Metric** toggle (Imperial → ft + in wheel; Metric → cm) and convert to cm on save. Anything present on a Hevy body-measurement entry (weight, lean mass, fat %, girths, etc.) lives only in **Body measurements backup** — never duplicated here. Filled from Questionnaire advanced and editable on Edit profile as its own subsection under Agentic memory. Persisted in its **own** user-scoped store — separate from the Constraint profile store — with the same product patterns (Edit-profile Save, agent **updateTrainingProfile** tool, prompt inject) but not the Mutation constraint gate. Mid-chat: agent may set fields when the user states them; clear or change only on a clear user statement (same spirit as **User-stated change**). Anonymous: Questionnaire advanced still collects answers for the session; **persist only when signed in** (same as Constraint profile). Specific weekdays are out of scope (builder cannot enforce them).
_Avoid_: Agent memory (deprecated name), Constraint profile (wrong kind), athlete profile (informal duplicate), user bio (identity section), chat refinements (constraint-adjacent freeform), freeform remember-this notes (v1 out of scope), sharing Mutation constraint gate, weekday schedule memory, duplicating Hevy body-measurement fields (weight, lean mass, fat %, girths), storing height as feet/inches only, merging Training profile into the Constraint profile table, Edit-profile-only Training profile with no chat update path, storing date of birth instead of age

**Constraint profile**:
Merged training constraints for one user — home-prompt inference plus questionnaire answers plus later chat refinements. Authoritative for exercise selection and program edits; agent must not re-ask fields already captured here. Chat may add freely when it recognizes a new constraint; it may remove or relax only on a **User-stated change**. One kind of Agentic memory, stored separately from **Training profile** (person facts). When a persisted row exists, array fields (injuries, excluded equipment, excluded areas, chat refinements) are **persisted-only** — merge does not re-union with stale questionnaire/session strings, so Edit profile removals stick across chat turns. Preferences still prefer a non-empty session value. New questionnaire array values for users who already have a row must arrive via chat `updateConstraintProfile` or **Edit profile** Save — not merge alone. When the user manually edits the profile (add, change, or remove), those edits supersede questionnaire answers and chat session inputs that would put a removed constraint back. On **Edit profile**, the Constraint Profile UI maps 1:1 to persisted fields (injuries, excluded equipment, excluded areas, preferences, chat refinements, raw statements) — not renamed umbrella labels — mirroring **Questionnaire core** (not Questionnaire advanced). Structured fields are editable; **raw statements** are the user’s exact words captured on agent updates — view and delete only (not freeform invent), so the user can purge wrong audit lines. Deleting a raw statement does not change injuries, equipment, areas, preferences, or chat refinements — those are edited separately. Constraint profile changes use a dedicated Save (separate from identity Save and from **Training profile** Save); nothing persists until that Save. On Edit profile, injuries and chat refinements accept freeform add; excluded equipment and excluded areas use fixed pickers (questionnaire option sets); all list fields support remove. Preferences use the same option sets as the questionnaire (not freeform).
_Avoid_: User preferences (too broad), questionnaire data (implementation-shaped), builder state, constraints (UI label), Other constraints (non-column label), single shared Save with identity, autosave per chip, freeform invent for equipment/areas, freeform preference text, merge re-union of arrays when a row exists, different field sets on questionnaire core vs Edit profile Constraint section, person-facts that belong in Training profile, merging Constraint profile storage with Training profile

**Body measurement**:
One dated body-metrics entry for a user — weight, lean mass, fat %, and girths (neck, shoulders, chest, biceps, forearms, abdomen, waist, hips, thighs, calves, etc.) as provided by the connected app. Canonical units metric (kg / cm). Source of truth after sync is Proxima’s backup, not live Hevy per request. These fields are excluded from **Training profile** so there is a single source per metric.
_Avoid_: Body stats (too vague), check-in (informal), profile weight (ambiguous), copying measurement fields into Training profile

**Body measurements backup**:
Proxima’s stored copy of the user’s **Body measurement** history, synced from connected fitness apps the same way **Workout history backup** syncs workouts — full backfill when Hevy is connected, then ongoing sync for new/updated entries. Canonical grain: one row per dated measurement entry per user. **Edit profile** Agentic-memory **Body measurements** subsection is **read-only** in v1 — shows latest and/or history from this backup; no manual add/edit. Not stored as columns on the Constraint profile / Training profile user-scoped stores. Coach access: inject a short **latest** measurement summary into the system prompt when a backup entry exists; on-demand history via an agent tool (same spirit as **Agent workout history tool**) when the user asks about trends or past check-ins.
_Avoid_: Hevy live fetch for coaching, embedding measurement arrays on the constraints row, one-shot latest-only with no history table, manual body-measurement entry on Edit profile (v1), dumping full measurement history into every prompt

**Agent body measurements tool**:
Pro-only chat tool that returns backed-up **Body measurement** entries from Supabase (limit / date window). Used when the user asks about weight or girth trends over time — not a substitute for the latest-summary prompt inject (which remains available whenever backup data exists). Backup sync and Edit-profile read-only view stay free. Distinct from **Agent workout history tool**.
_Avoid_: Live Hevy body fetch in chat, getWorkoutHistory for measurements, free unlimited history tool for free tier

**Training focus**:
Single Training-profile field for what the user is training toward — one structured single-select choice that replaces both a vague “primary goal” picker and a separate specialization picker. v1 catalog: bodybuilding, powerbuilding, powerlifting, hyrox, crossfit, olympic weightlifting, calisthenics / bodyweight, athletics / sport, fat loss, general fitness, rehab / pain-aware. Drives skill/resource selection and program framing; not a Constraint profile field.
_Avoid_: Primary goal (ambiguous duplicate), specialization (duplicate when used alongside goal), goalsOptions kitchen-sink list, multi-select training focus

**User-stated change**:
The user asserts that a Constraint profile rule no longer applies — e.g. injury healed, equipment acquired, area no longer excluded. Grounded in the user’s words (this turn or a clear recent statement), not in the agent’s preference for a program style. Agent may remove or relax constraints only on a User-stated change or via **Edit profile**; never to make a preferred split or exercise set feasible.
_Avoid_: Explicit request (implies confirm UI), agent-inferred removal, program-pressure override

**Mutation constraint gate**:
Hard check on agent-proposed program changes against structured Constraint profile fields (excluded equipment, excluded areas, injuries) plus structural rules such as no emptied training days. Runs before those changes reach the builder. Does not apply to manual grid edits or Sync — those honor the user’s explicit program state.
_Avoid_: Sync validator, ConstraintAwareMutation (ticket name), advisory prompt-only check

**Equipment constraint**:
Hybrid equipment rule within the constraint profile: excluded equipment types (questionnaire) plus explicitly available equipment (home prompt, chat). Exercise selection must satisfy both — excluded types out, available types in. Distinct from a single "cables only" label; captures setups like cable machine plus bench attachments.
_Avoid_: Exclude equipment (exclusion half only), gear list (too informal)

**Available equipment**:
Positive half of the equipment constraint — what the user explicitly has (e.g. cable machine, adjustable bench, attachments). Complements excluded equipment from the questionnaire; both apply together. **Deferred** as a first-class Constraint profile / questionnaire field — may still appear as freeform chat refinements until **Gym profile** ships.
_Avoid_: Allowed gear (informal), equipment list (ambiguous with full Hevy catalog), adding available-equipment questionnaire now ahead of Gym profile

**Gym profile**:
Future capability: named gym/setup profiles that gate exercise choices by where the user is training (home gym vs commercial, equipment on hand). Distinct from excluded-equipment questionnaire answers and from **Training profile**. Out of scope for the current questionnaire / Agentic-memory pass; will supersede ad-hoc available-equipment lists.
_Avoid_: Available equipment (partial precursor), location (too vague), Hevy gym

**Movement restriction**:
A constraint on how or where the user can train — e.g. no floor work, no kneeling, no single-leg exercises, avoid overhead with impingement. Lives in the constraint profile (health issues, chat refinements). Distinct from equipment constraint and from muscle-area exclusions.
_Avoid_: Limitation (ambiguous with load/volume), injury (health issue may imply restrictions but is not the same term)

**Restriction tag**:
Canonical machine-readable flag for a movement restriction (e.g. no floor, no kneeling, no unilateral). Derived from the constraint profile; used in a later enforcement slice to filter exercise candidates. Prompt and skills honor the plain-language source first; tags tighten tool-level filtering when present.
_Avoid_: Movement flag (too implementation-shaped), exclusion tag (ambiguous with equipment)

**Exercise objection**:
User pushback on one programmed movement — pain, equipment mismatch, can't perform position, or wrong stimulus — resolved by replace-in-place (or program-wide **Template swap** when the same template applies everywhere), never lone removal. Distinct from explicit remove/skip and from program-wide filters. Lasting limits implied by the objection belong in the **Constraint profile**; taste-only swaps do not.
_Avoid_: Complaint (too informal), exercise feedback (too broad)

**Questionnaire gate**:
Required `getMoreInfoQuestions` step before first `planProgram` / `buildWeek` on a new program. Collects structured prefs; merges into the constraint profile with home-prompt inference. After the user submits or says "Build my program", the agent must not ask again in chat for fields already captured — proceed to build using the profile. UI splits into **Questionnaire core** (always visible) and **Questionnaire advanced** (collapsed until opened) so first-time users are not overwhelmed; unanswered advanced fields stay empty and do not block build.
_Avoid_: Intake form (UI-shaped), pre-build questions (too vague)

**Questionnaire core**:
Always-visible questions in the Questionnaire gate — the full existing program-build set plus **excluded areas**: program length, days per week, excluded equipment, health issues, excluded areas, preferred split, exercise variability, progression system, deload week, peak week, warmup exercises. Same field group appears on **Edit profile** under Constraint profile so users can set them later without rebuilding.
_Avoid_: Primary questions, required questions (advanced is optional to expand, not a second gate), main form, thin core (do not move style prefs out of core)

**Questionnaire advanced**:
Collapsed-by-default deep-intake questions in the Questionnaire gate — extra personalization beyond the core build set (opened via expand/dropdown). Writes **Training profile**, not Constraint profile. First-time users can ignore and still build; power users or later **Edit profile** edits fill them in. Empty advanced answers are valid; agent uses home-prompt inference and defaults.
_Avoid_: Extra questions, optional questionnaire (implies skip-all), advanced settings (app-settings shaped), relocating core prefs into advanced, stuffing advanced answers into Constraint profile

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
Full read-only view of one backed-up **Workout** at `/workout/{id}` (`{id}` = Proxima backup UUID). Metadata block (title, date, duration, source badge, **Session goal** badge when classifiable, exercise/set counts, back to profile) plus full logged day card with all exercises and sets. Profile card shell on muted background; dedicated 404 when missing or not owned. Distinct from workout history browse (5-exercise preview cards on profile).
_Avoid_: Workout page (ambiguous with builder day), Hevy workout URL (external app)

**Workout history access**:
Reading backed-up workouts for product features (workout history browse, blind spot analysis, agent tool). Pro-gated for agent queries and full blind spot depth; backup sync, browse, and retention are free for all connected users so upgrade unlocks existing data immediately.
_Avoid_: Hevy API access (live fetch), export (program push to Hevy)

**Agent workout history tool**:
Pro-only chat tool that returns recent backed-up workouts from Supabase. Agent chooses how many workouts to pull (cap ~30). Optional filters by date or canonical exercise. Workout-scoped only in v1 — no separate exercise-history tool.
_Avoid_: getExerciseHistory (v1 scope), live Hevy fetch in chat

**Profile statistics**:
Hevy-style aggregate chart on the profile page — weekly Duration, Reps, and Volume totals derived from the workout history backup, with a time-range filter (last 4 weeks or last 12 weeks). Headline above the chart always shows the current Sun–Sat week total for the active tab (Duration, Reps, or Volume), independent of the chart range. When at least one prior week of backup exists, a **Profile consistency line** appears under the headline — current-week workout count and trailing average workouts per week. Duration uses workout wall time (`ended_at − started_at` per workout, summed by week). Reps uses total reps across all sets in each week (null reps excluded). Volume uses the sum of `weight_kg × reps` per set in each week (null reps excluded; zero or null weight contributes 0 — same rule as blind spot session volume). Volume is stored in kg; the UI shows the user's preferred weight unit. Weeks bucket by `started_at` using Sunday-start calendar weeks (US convention). Free for all users with Hevy connected and backup data — not Pro-gated. Distinct from blind spot analysis (per-exercise stall detection) and from the header workout count (lifetime total).
_Avoid_: Workout stats (ambiguous with header count), activity chart (too generic)

**Profile consistency line**:
Muted subline under the **Profile statistics** "This week" headline — `{N} workouts · {avg} avg/wk`. N is backed-up **Workout** count in the current Sun–Sat week (live as the week progresses). avg is the mean workouts per week over the prior weeks in the active chart range (last 4 or last 12 weeks, current week excluded; zero-workout weeks in that window count as 0). Hidden when no prior weeks of backup exist. Shown regardless of active Duration/Reps/Volume tab; updates when the chart range changes. Distinct from **Training streak** (consecutive trained weeks in the header).
_Avoid_: Consistency score (too vague), on-track label (deferred judgment copy)

**Profile calendar**:
Month grid beside **Profile statistics** on the profile Stats tab (Sunday-start week row, US convention — same as profile statistics) — one highlighted day per calendar date that has at least one backed-up **Workout**, using the same local workout date shown on workout history browse cards (workout start, not finish). One highlight per day regardless of how many workouts that day. **Today** (user's local calendar date) always gets a distinct ring outline; when today also has a workout, the teal workout circle keeps its fill and adds a contrasting ring. User can navigate to any month across full synced backup history (independent of profile statistics’ 4/12-week chart range); highlights load per visible month and refill silently as backup sync adds workouts (no sync status copy on the calendar card). Month navigation is unbounded — empty grids before the first workout or after today are allowed; future months show no highlights. Hovering, focusing, or tapping a highlighted day opens the same tooltip (tap-to-open on touch; dismiss on outside tap) listing each backed-up **Workout** that day — title, duration, date, and a **See Workout** link to **Logged workout detail** — stacked when multiple sessions share a date. Opens on the current calendar month by default. Free for all Hevy-connected users with backup data (not Pro-gated). Shown only when Hevy is connected (same gate as **Recent workouts**). Distinct from profile statistics (weekly Duration/Reps/Volume aggregates).
_Avoid_: Activity calendar (too generic), workout calendar (ambiguous with builder schedule)

**Profile header**:
Top identity block on the profile page — avatar, @username (primary), display name (secondary), bio, Edit profile, and stat row (Workouts, **Training streak**, Followers, Following when Hevy connected; Workouts, Followers, Following when not). Stat row uses Hevy layout: label above number. Workouts stat folds in backup sync state (count when caught up; fraction + status dot when syncing/paused/error; inline pause/play icon when syncing or paused). **Training streak** is a fourth stat when Hevy connected — consecutive Sunday-start weeks with at least one backed-up **Workout**, counting backward from the most recent trained week; an in-progress current week with zero workouts does not break the streak until the week ends empty. Hevy-parity layout; no photo banner.
_Avoid_: Profile hero (implementation component name), user card (too generic)

**Training streak**:
Consecutive Sunday-start weeks (US ET, same as profile statistics) with at least one backed-up **Workout**. Count walks backward from the most recent week that qualifies; the in-progress current week is ignored when empty (grace until the week closes). Shown as the **Streak** stat in **Profile header** when Hevy connected — numeric week count only (e.g. `4`). Zero when no qualifying streak. Distinct from **Profile consistency line** (current week vs trailing average).
_Avoid_: Day streak, GitHub streak, streak badge on calendar

**Recent workouts** (profile):
Horizontal browse feed on the profile page — read-only preview cards for backed-up **Workouts** (≤5 exercises each), newest first, cursor-paginated with load-more. Card header shows title, date, duration, and **Session goal** badge when classifiable. **See more exercises** links to logged workout detail when needed. Shown only when Hevy is connected. Sits after profile statistics and before **Program overview** / **Hevy folders**. White card on muted page background per profile Hevy layout.
_Avoid_: Workout feed (ambiguous with social feed), workout history list (too generic)

**Session goal**:
Inferred training intent for one backed-up **Workout** — **Strength**, **Hypertrophy**, **Endurance**, or **Mixed** — from working-set rep distribution (excludes warmups; includes normal, dropset, and failure sets with non-null reps). Rep zones: Strength 1–5, Hypertrophy 6–12, Endurance 13+. Label is the zone with ≥50% of total working-set reps; otherwise **Mixed**. No badge when there are zero qualifying working sets. Computed client-side from logged sets; shown as a pill on **Recent workouts** preview cards and **Logged workout detail** metadata. Distinct from blind spot analysis (per-exercise performance) and from profile statistics (weekly aggregates).
_Avoid_: Session type (ambiguous with builder day), workout tag (too generic)

## Legal & privacy

**Account registration**:
Creation of a Supabase auth identity when a user completes sign-up — before email confirmation for email/password, or on first OAuth provider link for third-party sign-in. Distinct from email-confirmed account and from first authenticated session.
_Avoid_: Sign-up (ambiguous with legal acceptance step), verified user, new user (ops informal)

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

**Edit profile**:
Dedicated account page for identity (name, username, bio, photo) and for inspecting/editing **Agentic memory**. Identity section first; then Agentic-memory subsections: **Constraint profile**, **Training profile**, and **Body measurements** (read-only from **Body measurements backup**). Distinct from the profile page (training stats, Hevy programs, recent workouts) and from **Privacy settings**. Replaces the old profile-page dialog. Separate Saves for identity, Constraint profile (**Save constraints**), and Training profile; Body measurements are sync-backed only (no draft Save). Unsaved identity **or** Constraint profile **or** Training profile drafts block leave with a warn — stay or discard.
_Avoid_: Edit profile dialog, profile preferences card, silent discard of unsaved edits, Constraint-profile-first layout that hides Training profile, tabs that hide memory, constraint-only leave warn, single shared Save, localStorage draft, autosave per chip, treating body-measurement history as a Constraint Save, editable body measurements in v1

**Agentic memory peek**:
Read-only condensed **Agentic memory** summary near the build-program chat input — separate from token-usage Context. Signed-in users only (hidden when anonymous). Sections: **Constraint profile**, **Training profile**, and latest **Body measurement** (when backup has one). Each section sits in its own collapsed dropdown; the first section with content (else Constraint profile) is open by default. Shows non-empty structured fields only; truncates long values. Omits Constraint profile **raw statements** (Edit profile only). When all sections empty: still show the control with empty copy and a link to **Edit profile**. Reflects mid-chat Constraint profile and Training profile updates in the same session. Link to **Edit profile** for changes; no editing in the builder.
_Avoid_: Constraint profile peek (old name — too narrow), Context hover (token usage), inline memory editor, memories panel, full 1:1 field mirror in builder, hide when empty, stale-until-reopen only, anon session-only peek, all sections expanded at once

**Privacy settings**:
Dedicated account page reachable from the sidebar account menu. Hosts revocable **Platform improvement consent** and **Marketing consent** toggles. Distinct from **Edit profile** and from the **Legal acceptance dialog** (required policy gate).
_Avoid_: Profile preferences card, settings (too generic)

**User consents**:
Single per-user record in Supabase (`user_consents`) holding **Legal acceptance** (FKs to `policy_versions` for Terms and Privacy), **Platform improvement consent**, and **Marketing consent**. One row per user; created on sign-up or first authenticated session. Audit timestamps: `legal_accepted_at`, `platform_improvement_opt_in_at`, `marketing_opt_in_at` (nullable when opted out). No append-only event log in v1.
_Avoid_: user_preferences (ambiguous with app prefs), legal_acceptances (too narrow), consent_events table (v1 out of scope)

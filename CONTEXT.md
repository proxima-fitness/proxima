# Proxima Landing

Marketing site, logged-in app, and **Public API** for Proxima Fitness. AI workout program builder, program vault, and training tools.

## Language

### Integrated training coach


Proxima's product role on the web, an AI agent that builds and advises on workout programs inside the builder (`/build-program`). Not a separate mobile app or static marketing site. The home page (`/`) exists to start **New arrival**. Ongoing coaching happens in the builder.


_Avoid_: Personal trainer app, Proxima app (deprecated marketing surface), landing page product




### Public API


The versioned HTTP surface athletes, third-party apps, and agents use to write **Workouts** and **Custom exercises** into a user's account, and to list **Canonical exercises**. Writes require a **Public API key**. The **Canonical exercise** list is world-readable. Distinct from Hevy sync and from signed-in app routes. A Public API **Workout** is history-only: it does not count as **Day complete**. POST is first-write-wins on **Workout source** + external ID. GET, PUT, and DELETE address that **Workout** by its Proxima backup id.


_Avoid_: Developer API, developer mode, webhook ingest, treating Hevy sync as this surface




### Public API key


A secret the athlete mints to call the **Public API** as themselves. One key per athlete: minted and shown once in account settings, then revoke-and-replace. Distinct from the Hevy API key used for native sync.


_Avoid_: Hevy API key, OAuth token, session cookie




### Workout source


The fitness app that produced a **Workout**. A slug the caller must send, taken from the closed Public API source list of weight-training apps. Unknown slugs and `hevy` are rejected. An agent uploading on the user's behalf sets this to the app the session was logged in, not to the agent. `manual` is the listed slug when there is no app.


_Avoid_: Agent as source, treating the API key as the source, app display name (use the slug), `other` as a catch-all




### Arrival


How the user landed on `/build-program` (URL params + navigation source). Determines program hydration and chat session bootstrap.


_Avoid_: Entry point (ambiguous), route, landing




### New arrival


Entering the builder to create a program, typically from the home prompt with a `search=` dispatch (attachments optional). Homepage primary conversion. Distinct from Edit arrival, `?empty=true`, bare `/build-program` redirect, and chat navigation.


_Avoid_: Build program, home prompt (implementation-shaped)




### Dispatch


An event that calls the LLM send path (`sendMessageWithContext`). May happen zero or more times after an arrival.


_Avoid_: Entry point (ambiguous), trigger (too generic)




### ChatEntryPlan


Pure config returned by `resolveChatEntryPlan`. History bootstrap, auto-send policy, shell stability, session-on-first-send rules for one arrival + runtime snapshot.


_Avoid_: Chat state, session config, entry point




### Chat navigation


User intentionally opens a different chat context. That is a sidebar recent row, or a home prompt with pre-minted `?chat=` already in the arrival URL. May remount the program-builder shell and reset program hydration for that context.


_Avoid_: Entry point, route change (too broad)



### Chat title


The name of a chat, shown on sidebar recent and pinned rows. Distinct from a **Proxima program** name.


_Avoid_: Chat history title, thread name, conversation name, using the program name as the chat label




### Arrival intent


Whether the current `/build-program` session started as chat navigation (`?chat=` already in the arrival URL or sidebar row selected). Distinct from session mint updating `?chat=` later. Mint must not change shell key or re-trigger program hydrate.


_Avoid_: Initial state, URL params (too implementation-shaped)




### Session mint


First-send bookkeeping that writes `?chat=` to the URL after insert-on-send. Not chat navigation. Shell and program hydrate must stay stable through the in-flight send turn.


_Avoid_: URL update, chat creation (implementation)




### Empty program template


The pre-seeded `emptyHevyProgram` grid shown when the user explicitly starts a blank program. Allowed only for New Chat (`?empty=true`) and bare `/build-program` redirect. Not for **Sign-in return** (`resume=true`), home prompt (`?search=`), or other dispatch arrivals.


_Avoid_: Empty grid (ambiguous, an empty grid may be correct without the template), applying the template because `empty` survived on a **Sign-in return** URL




### Sign-in migration


Post-arrival auth orchestration (derived bootstrap + `useMutation`, no new effects) that persists an anonymous thread from `CHAT_MESSAGES_KEY` (or in-memory messages) to Supabase, assigns `?chat=`, and clears anon localStorage. Runs on **Sign-in return**; leftover `empty` does not skip it. Behaves like session mint for shell/hydrate, not chat navigation.


_Avoid_: Auth transition (too broad), login flow, treating **Sign-in return** as New Chat




### Chat-program connection


Associating a saved program with a chat row by setting `program_id` on the chat. Triggered only on explicit Save when a chat session exists (`?chat=`). Optional. Program Save does not require chat.


_Avoid_: Link chat to program (reversed direction), save chat




### Proxima program


The multi-week training block owned in Supabase, single source of truth on the **New path**. Has consecutive weeks, progress on its **Program overview**, and week-at-a-time **Week Export** to Hevy. Distinct from a **Hevy program (edit scope)**, which may exist with no Proxima program. Multiple active Proxima programs allowed in data. Overview switches via program picker buttons.


_Avoid_: Overarching program, program-in-progress (UI-shaped), Program (alone, ambiguous with Hevy), vault program




### Program overview


Per-**Proxima program** profile panel. Week rail (status for every consecutive week) plus **Week preview** for the **Selected week**. **Week complete** / **Edit current week** when that selection is the **Current week**. Also **AI week suggest**, **Edit program**, and that program's **Hevy mirror**. A percent bar under the title is **Day complete** over planned days in the **Program prescription** (each logged day moves it; **Week complete** counts that week's planned days). **Edit program** is always a quiet control under the title (desktop) or in Program actions (mobile), not on the Export row. Export destinations removed from the builder (PDF, Hevy / **Week Export**, spreadsheet) live here as a per-program **Export** dropdown. The Hevy option is gated **Week Export**. PDF / spreadsheet export the full **Program prescription**. One overview visible at a time. When multiple active programs, picker buttons at the top switch which program's overview is shown. After **Hevy mirror**, **Created programs** lists owned programs the owner **Leave**d. Replaces profile **My Programs** vault browse. Lives at the top of a single profile scroll (no Stats/Programs tabs). Backend / **Hevy program sync** must support more than one active program.


_Avoid_: Flat full-height week list with no preview, program carousel / swipe between programs, separate My Programs / My Hevy Programs sections, Stats/Programs tabs, vault browse on profile, forcing a single active program in data, builder Export button, **Week complete** / program length as the overview percent




### Selected week


The week currently shown in the **Program overview** **Week preview**. User picks it from the week rail (desktop) or week chips (mobile). Defaults to **Current week**, or week 1 when none. May differ from **Current week** while browsing. Does not change export/complete rules by itself.


_Avoid_: Current week (status), focused week, active week (ambiguous with Current)




### Week preview


Read-only glance at one week inside a **Program overview**. One day at a time. **Desktop:** read-only **HevyDayCard** (full exercises/sets) with prev/next when the week has multiple days. **Mobile:** day chips under the week chips + compact exercise list (name, sets · reps; no Lbs/RPE columns; first few exercises then "+N more") — not **HevyDayCard**. **Planned vs completed** is still one day: two cards on desktop (plan | log), or two stacked compact lists on mobile. Shown for the **Selected week**. What it renders depends on **Week preview source**. Not the **Hevy mirror**.


_Avoid_: Week detail (builder edit), treating preview as editable Sync surface, always reading the prescription, using **Hevy week copy** as a historical record, dumping every day of a complete week onto one screen, using **HevyDayCard** as the mobile Week preview body




### Week preview source


Which document(s) the **Week preview** shows for the **Selected week**. Not exported → **Program prescription**. Exported and not **Week complete**, linked folder still in Hevy → **Hevy week copy** (empty folder stays empty). Exported and not **Week complete**, linked folder gone from Hevy → **Program prescription**. **Week complete** → **Program prescription** and logged **Workouts** together (**Planned vs completed**). Deleting those **Workouts** un-completes the week; preview then follows the incomplete rule (folder still there → **Hevy week copy**; folder gone → prescription). Deleting **Hevy routines** or the folder of a complete week does not by itself change that week's preview. Named by a **Day card source badge**.


_Avoid_: One document for a complete week that still has Workouts, using **Hevy week copy** as the planned side of the record, always reading the prescription for an exported incomplete week whose folder still exists, substituting Workouts or prescription for an empty in-progress folder, treating a missing complete-week folder as not exported




### Planned vs completed


The **Week complete** **Week preview**: **Program prescription** (`Planned`) with logged **Workouts** (`Completed`), still one day at a time. Not a **Hevy week copy** comparison. Only after **Week complete**. Join is the routine id each planned day got at **Week Export**, not the live day number. A planned day with no **Workout** keeps an empty Completed slot (`Not logged`). A **Workout** that was not an exported planned day hangs off as Completed only (`Not in the plan`). Several **Workouts** for the same planned day: the latest; earlier ones stay in workout history.


_Avoid_: Pairing Hevy copy with Workouts as the record, showing this pair on **Current week**, lining up by live day number after add/remove, hiding an empty half, paging every log for that day here, calling it a diff/delta (the documents sit together; they are not a computed patch)



### Day card source badge


Corner label on a **HevyDayCard** (desktop Week preview) or on a stacked mobile compact list naming which document is showing: `Planned` (**Program prescription**), `In Hevy` (**Hevy week copy**), `Completed` (logged **Workouts**). Ships on **Week preview** (and any other card that can mix sources) so the SoT is visible, including for debugging. **Planned vs completed** shows both `Planned` and `Completed`.


_Avoid_: Omitting the badge, implying the card is editable, using internal names (prescription / Hevy week copy / Workout) as chip text




### Hevy mirror


Subsection of a **Program overview** slide for that program's active Hevy week copy (via **Program-Hevy link**) and for Hevy-only folders with no Proxima program. UI label: **In Hevy** (not "Hevy mirror", domain term only). Default density: **Current week** folder primary, other weeks behind a disclosure ("Other weeks in Hevy"). Hevy-only / unlinked folder rows: **Edit** (Hevy-only **Edit path**) and **Make into a program**. Linked rows: **Edit current week** or Hevy-scope Edit only — no promote. Replaces the old standalone profile **Hevy folders** / "My Hevy Programs" grid.


_Avoid_: My Hevy Programs, Hevy folders (as a separate profile section), shipping "Hevy mirror" as user-facing copy, treating mirror as equal primary to the week rail / **Week preview**, always listing every folder expanded




### Hevy folders (retired UI label)


Former name for the standalone profile Hevy grid. Do not ship as its own section. Use **Hevy mirror** inside **Program overview**. Folder/routine objects in Hevy APIs are still "folders" in engineering talk.


_Avoid_: Reviving My Hevy Programs / Hevy folders as a top-level profile card




### New path


Create and progress a **Proxima program**: build → **Save** → **Start** → **Program overview** → **Week Export** week 1 (then the week loop). PDF / spreadsheet still live on overview. The builder has no Export control and does not mention Export or **Week Export**. Not the **Edit path**.


_Avoid_: New mode (builder UI label), New arrival (entry mechanic only), Export-all-to-Hevy workflow, builder Export button, teaching **Week Export** in the builder




### Save (New path)


Persist the builder's **Program prescription** to Supabase. Toolbar button labeled **Save** on **New path** and **Edit program**. Anonymous users get **Sign in to save** in that same slot (returns to the builder after login) — never a second persist button. Does not push to Hevy. First **New path** Save INSERTs a new **Proxima program**; later **Edit program** Save UPDATEs that same program (owner only). Success toast is `Saved`. After a this-session Save, while the grid is clean and the program has no **Program–Hevy link**, this same slot becomes **Start**. It becomes **Save** again if they edit. This is not the persist control on **Edit current week**.


_Avoid_: A second toolbar persist button, **Start** beside **Save**, using this operation on **Edit current week**, Update program, Export, treating **Edit program** Save as a fork, auto-navigating to profile, a toast that names Export or **Week Export**




### Join


Signed-in user subscribes to a **Proxima program** they do not already have on **Program overview**. The program then appears there. Distinct from **Save** (persist the **Program prescription**) and from **Personalize** (fork into a new owned program). **Save** auto-Joins the owner. After **Leave**, the owner Joins again from **Created programs**.


_Avoid_: Save, Bookmark, My Programs, using Export to Hevy as the subscribe trigger




### Leave


Signed-in user drops a **Proxima program** from **Program overview** (confirm). Other Joiners keep it. The owner may Leave so they can hide a program they still own without **Delete**.


_Avoid_: Unsubscribe, Bookmark, Delete (destroys the program)




### Delete (Proxima program)


Owner destroys that **Proxima program**. Confirm warns any lifter training it will lose access. Does not delete Hevy folders/routines or backed-up **Workouts**. Not **Leave**.


_Avoid_: Leave, archive, fork-on-delete for remaining Joiners, an `is_coach` exception




### Created programs


Owner's **Proxima programs** that are not on **Program overview** because the owner **Leave**d. On the profile after **Hevy mirror**. Hidden when empty. Each row: title, joined count, **View** (slug page), **Join**, **Delete**.


_Avoid_: My Programs vault, a second overview week rail without Join




### Start


The persist-slot control (arrow) on **New path**, **Make into a program**, and **Edit program** after a this-session **Save**, while the grid matches that Save and that program has no **Program–Hevy link**. Opens that program's **Program overview**. Hidden on an unsaved or dirty grid and after the first **Week Export**. Not shown on **Edit current week** or Hevy-only **Edit**. Does not **Week Export**. Does not sit beside **Save**.


_Avoid_: Open profile, builder **Week Export** / Export, auto-navigate on **Save**, a banner, showing it before the program is Saved, showing it while the prescription is dirty, keeping it after the first **Week Export**, **Start** beside **Save**




### New-path leave guard


When the builder has unsaved **New path** prescription changes (dirty / undo stack) and the user tries to leave, block in-app navigation with **Discard** (wipe **Builder draft** / `hevy-program-in-progress` + related keys, then navigate) and **Cancel** (close dialog, stay on builder so they can press toolbar **Save**). No Save action inside the dialog. Tab close/refresh may use `beforeunload` when dirty. Does not trap browser back. Going to login or sign-up to complete **Save** (**Sign in to save**, header Log in) is **Sign-in return**, not leave: no dialog, no Discard.


_Avoid_: Edit navigation guard (Sync-oriented), Save and Continue, autosave on leave, treating **Sign-in return** as leave, Discard on auth CTAs




### Program-Hevy link


On each **Week Export**, after Hevy creates the week's routine folder (and routines), Proxima persists that folder's ID against the **Proxima program** + 1-based week, plus the live **Hevy routine IDs** in day order. That row is the week's **Hevy week copy** pointer. **Day complete** matches a **Workout** to those routine IDs, never folder/routine title.


_Avoid_: Title match (`Week N - ...`) for identity or day-complete, in-memory-only, assuming Hevy folder id == week index, treating the array ordinal as **Day complete** identity




### Linked day


One planned **Hevy routine** on a **Program–Hevy link**: its **Hevy routine ID** in the live `hevy_routine_ids` list, in folder order. Display day is 1…n of that live list (compact). **Day complete** keys off the routine ID, not the ordinal. **Athlete-added routines** are not in the list. Builder add (Sync POST) inserts an ID; builder remove or Hevy-app delete drops it and survivors compact. Only Proxima (Export or Sync POST) adds planned IDs.


_Avoid_: Stored holes (Day 1, 2, 4), not-live slots, using the ordinal as **Day complete** identity, adopting **Athlete-added routines** into the list, using this live list as the **Planned vs completed** join



### Export-time Hevy routine IDs


The **Hevy routine IDs** assigned to each **Program prescription** day at **Week Export** or **Re-Export**, in plan order. Join key for **Planned vs completed**. Distinct from the live **Linked day** list. **Sync** does not rewrite them.


_Avoid_: Treating live `hevy_routine_ids` as the plan-to-Workout join after add/remove, a child table of days, title match




### Athlete-added routine


A **Hevy routine** the athlete created in the Hevy app inside a linked week folder, not part of the week's plan. **Edit current week** loads it; it never becomes a **Linked day**, never gets **Day complete**, and never blocks **Week complete**. Its **Workout** is recorded like any other.


_Avoid_: Adopting it into the link, letting it inflate the expected-day count, dropping it from the builder, treating it as a builder-added day




### Folder reconcile


How the live Hevy folder maps onto the **Program–Hevy link**. Builder-added days become **Linked days**. **Athlete-added routines** stay unofficial. A planned routine the athlete deletes in Hevy is no longer expected for **Week complete**.


_Avoid_: Full-adopt (every folder routine is a planned day), freezing the link at **Week Export** so Proxima cannot add a day




### Edit path


Modify training in the builder and push to Hevy via Sync. Two valid uses: (1) **Edit current week** of a **Proxima program**, or (2) edit a **Hevy program (edit scope)** with no Proxima program, a helpful split builder. Distinct from **New path**. **Make into a program** is a **Hevy mirror** action on an unlinked folder, not a button inside this session.


_Avoid_: Edit mode (UI label only), Edit arrival (entry mechanic), assuming every Edit implies a Proxima program, assuming Sync writes Supabase, requiring an Edit session before **Make into a program**




### Edit current week


**Edit path** entry that loads the **Current week**'s live **Hevy week copy** into the builder, not that week's **Program prescription** slot. Toolbar persist on this entry is labeled **Sync** and runs **Sync** (Hevy only). A day that already has a **Workout** is shown, locked (same lock as while the agent is streaming), and marked done; it is not edited. The **Program prescription** is changed through **Edit program**. Offered for the **Current week** only. After **Week complete**, that week is done in Hevy; the next Hevy write is **Week Export** of N+1.


_Avoid_: Edit mode (too broad), a second persist toolbar button, labeling this control **Save**, writing the prescription from this entry, editing a **Day complete** or **Week complete** routine, using Sync to fix logged **Workouts**, showing **Start** on this entry




### Edit program


Overview action that edits the **Program prescription** of that **Proxima program**. Owner-only: toolbar **Save** updates this program; it does not create a copy. Distinct from a public share load (`shareId` / Personalize), which **Save**s as a new **Proxima program**. Does not **Sync**. A week is writable only when that slot can still become a Hevy write: not exported, or linked ∧ not **Week complete** ∧ not **Current week** (**Re-Export**). **Current week** and **Week complete** columns are visible and locked. Add/delete/insert week only on the unexported tail; linked week numbers never shift. To change this week in Hevy, the user uses **Edit current week**. On **Program overview**, a quiet title-row control (desktop) or Program actions (mobile) so the week loop (**Edit current week**, **AI week suggest**, **Week Export**) stays primary.


_Avoid_: Edit current week, Update program, Syncing Hevy from this entry, locking every exported week (blocks **Re-Export**), using a public share URL as the write key, forking a second program on this action, putting it on the Export row, reindexing **Program–Hevy links** when a week is deleted




### Current week (overview)


The earliest week with a **Program–Hevy link** that is not yet **Week complete**. Later linked weeks can exist (already exported). Those later weeks still match **Workouts** on their link and can become **Week complete** if the athlete trains them; if unused they may be **Week Export**ed again. **Edit current week** / Sync target this week only, and only while its linked folder still exists. If that folder is gone, the writer is **Week Export** of this week again (fresh Hevy copy). When every linked week is complete, there is no Current week; the forward action is **Week Export** of N+1, blocked until week N is complete.


_Avoid_: Calendar week, Selected week, using the highest incomplete week when an earlier week is open again, Re-Export of **Current week** while its folder still exists, deriving current week from Hevy folder titles




### Program prescription


The trainer plan stored as the **Proxima program**. Source of **Week Export**, including N+1 after **Week complete**, **Re-Export** of a later unused linked week, and **Re-Export** of **Current week** when its linked folder is gone. SoT for a week that has not been exported, and for an incomplete week whose linked folder is gone. After Export, this week's execution document is the **Hevy week copy** until **Week complete**; gym-week changes do not rewrite this plan. **Edit program** may rewrite a slot only when it can still be Exported; that does not change the **Hevy week copy**.


_Avoid_: Using it as this-week SoT after Export, treating last week's Hevy divergences as the next **Week Export**, Program (alone), template (ambiguous with exercise template)




### First build


Creating a multi-week **Program prescription** on the **New path** (empty grid or a one-week seed such as **Hevy share import** expand). Week 1 is authored, copied across program length, then the **Periodization wave** is applied. The result lands immediately. Distinct from a **Mutation proposal** on an existing program.


_Avoid_: First chat turn, week-1-only land without the **Periodization wave**, treating plated clones as a finished **Proxima program**, separate `planProgram` before land




### Periodization


Prescribed change of target RPE, working-set count, and rep range across weeks of a **Program prescription**: accumulation climbs, a deload is easier, a peak is harder. Written at **First build**. Distinct from **Progression**.


_Avoid_: Progression, weekProgression, pre-writing kg or logged reps, **AI week suggest**




### Progression


Updating the next occurrence of the same lift's weight or achieved reps from how that lift was performed. Not in the product. Distinct from **Periodization** and from **AI week suggest**.


_Avoid_: Periodization, applying the questionnaire progression system at **First build**, `constraint.progressionHonor` on a first-build grid, silent double-progression in **Hevy program sync**




### Periodization wave


Andy-authored week-by-week **Periodization** targets on the **First build** land call (`buildProgram`). Required with week 1 (or share-expand roles). Deltas from week 1 on **Exercise role** mains (RPE and set count). Every week after week 1 must change mains (nonzero RPE or set-count delta, or a **Block boundary** rep range). Absolute rep range only at a **Block boundary**. Accessory RPE/set line only on claimed deload or peak weeks. Code applies it before the grid may land. Distinct from **Progression**.


_Avoid_: weekProgression, progression table, overload recipe, per-lift kg arrays, Andy emitting per-week `mutateProgram` `update_set` as the apply path, code-invented default wave, a separate plan tool that only stores the wave, later-week mains left at week-1 zeros




### Exercise role


Tag on each week-1 exercise row at **First build**: `main`, `accessory`, or `warmup`. The **Periodization wave** attaches to mains. Not persisted on the **Program prescription**. Not sent to Hevy. Distinct from set type `"warmup"` (a lighter set on a working lift).


_Avoid_: Compound flag on a Hevy exercise template, first-row-is-the-main (warmup *rows* sit first), storing the tag for **Edit program** re-stamp




### Block boundary


The first week of a new named **Mesocycle block** on the **First build** plan (new job: intensification, peak, deload). Rep range on the **Periodization wave** may change here. When exercise variability is `lots`, lifts may swap here, not every week. Distinct from **Current week**.


_Avoid_: Every Sunday, weekly main-lift hopping, using **Selected week**




### Mesocycle block


Andy-named span of weeks on a **Proxima program** (name, week list, intent) written at **First build**. Claimed phases for the athlete UI and later coach context. Persisted on the program. Distinct from **Block boundary** (the first week of a new block) and from the **Periodization wave** (the numeric deltas). Code checks that a claimed deload-class week is easier and a claimed peak is harder on mains; Jev does not re-judge those phase labels from set-count and RPE alone.


_Avoid_: weekIntents (implementation snapshot field), plan blocks as Soft-fail evidence for skill phase honors, treating persistence as a substitute for the wave




### %1RM load


Deferred. Prescribed kg from a known 1RM (including a Hevy 1RM). Not **First build** **Periodization**. Not **Progression**.


_Avoid_: Filling `weight_kg` at **First build**, treating `% 1RM` / `percent_rm` as the wave, mixing prescribed load with RPE deltas




### Week complete


Week N finished: its planned days each have a matching **Workout**, or the athlete marks it complete. That status survives deleting the week's **Hevy routines** or folder; the proof is the **Workouts**, against the **Program prescription**. A complete week cannot be **Week Export**ed again. Deleting the folder of a complete week is cleanup, not un-complete. If those **Workouts** are later gone, it is not **Week complete**; preview follows **Week preview source**.


_Avoid_: Treating Hevy folder deletion as un-complete, treating routine deletion as history deletion, allowing re-Export of a complete week




### Day complete


A planned **Hevy routine** already has a matching **Workout**: `workouts.routine_id` is in that week’s `hevy_routine_ids`. In **Edit current week** that day is visible, locked, and marked done. Distinct from **Week complete**. Deleting the routine does not undo this; deleting the **Workout** does. If the week is not **Week complete** and the linked folder is gone, a later **Re-Export** is a fresh slate: old **Workouts** stay in history and do not count on the new IDs.


_Avoid_: Calling a Workout a routine, implying the planned routine was deleted, nthDay / schedule-history as identity, title match, carrying old logs onto a missing-folder Re-Export, treating a **Public API** Workout as Day complete


_Avoid_: Calling a Workout a routine, implying the planned routine was deleted, nthDay / schedule-history as identity, title match




### Week Export


Push one week of a **Proxima program** to Hevy as a new folder + **Hevy routines**, and write that week's **Program–Hevy link**. Week N+1 requires week N **Week complete**. **Re-Export** is allowed when the week is linked and not **Week complete**, and either is not **Current week**, or is **Current week** whose linked folder is gone. That missing-folder **Re-Export** is a reset: new folder, new routine IDs on the same week row, old **Workouts** unrelated. While the **Current week** folder exists, **Edit current week** Sync is the writer, never a second Export. A **Week complete** week cannot be Exported again. Deleting its Hevy folder is cleanup; **Workouts** still prove the week. On **Program overview**, if Hevy is not connected, the Hevy-week control is **Connect Hevy** (same connection dialog as the account menu), not a disabled Export. After a key exists, it is **Export Week N**. Missing key is not a week-loop gate reason.


_Avoid_: Re-Export of **Current week** while its folder still exists, Re-Export of a complete week, Export N+1 while an earlier linked week is incomplete, treating a missing Hevy folder as "not exported" when the week is already complete, naming **Week Export** or Export in the builder, a disabled Export with no hint when Hevy is disconnected, folding missing key into the week-loop gate




### Hevy export gate


In-chat multi-step UI opened when the user asks to push a program to Hevy but is missing account or Hevy connection prerequisites (sign in, then Hevy API key, skip steps already done). Unblocks those gates only. Does not **Save**, does not **Start**, does not run **Week Export**. Builder-visible copy (including the system prompt) never names Export or **Week Export**; next chrome follows the persist slot (**Save** then **Start**, or **Start** when that slot already reads **Start**). Distinct from the **Questionnaire gate**. If that gate is active, do not open this one; tell them to finish or dismiss the questions first.


_Avoid_: Chat gate card, action surface, agent export, in-chat Week Export, builder Export, “don’t click Export”, injecting Hevy API key secrets into the agent, replacing an open Questionnaire gate




### Hevy write quota


Not a product cap. **Week Export**, **Re-Export**, **Edit current week** Sync, Hevy-only Sync, and **Save** do not consume usage. A signed-in user can run the week loop for free with manual **Edit program** / **Edit current week**. Paid usage is LLM chat and **Blind Spot** depth. The old monthly export limit is removed.


_Avoid_: Monthly exports, charging Hevy writes, week-1-free as an exception, Sync-free loophole, a second Hevy meter beside LLM




### Usage period


The calendar month (UTC) that one `feature_usage` row counts. One row per user per month, keyed `(user_id, period_start)` where `period_start` is the 1st. The row is created lazily by the first metered LLM action that month, so an **absent row means zero used** and quota resets with no scheduled job. Hevy writes do not create or increment a period row. `get_my_feature_limits` reads only the current period's row and returns `resets_on` (the 1st of next month), surfaced in copy only when the user is out of usage. Anonymous users have no usage period. Their localStorage counter is lifetime. Not the Stripe billing period. Free users have no subscription, and Stripe period columns move between sync-engine versions.


_Avoid_: Billing period (Stripe-anchored), monthly reset (implies a cron job), lifetime usage (pre-migration behaviour), showing the reset date before the user is blocked




### Hevy program sync


Edge function invoked on-demand when the user opens profile / overview (not midnight cron). Used to stamp **Day complete** into `program_schedule_history`. App matching is **Workout** backup `routine_id` ∩ that week’s **Program–Hevy link** `hevy_routine_ids`; this write is leftover. Hevy-app title ✓ is a Next PUT on that same join, next to backup — not auto next-week upload, not silent weight writes. Auto next-week upload / silent double-progression / email commented out (not deleted).


_Avoid_: Treating the schedule-history stamp as **Day complete** SoT, Sync (Edit-path Hevy push), title parse as match key, midnight cron




### AI week suggest


After **Week complete**, optional progression / exercise tweaks for week N+1. Generated **lazily** on first expand of the suggest panel, not on mark-complete or Export click. Cached once per program + completed week. Cache miss with remaining LLM: successful generate consumes one unit (same meter as chat). Cache miss at 0 remaining: still generate, cache the full row, return a truncated summary and no changes (Apply replaced by Upgrade). Unlock is remaining > 0: full cache, no regenerate, no consume. A row that already consumed a unit always returns full, even if remaining is later 0. Apply, skip, cache hit, and failed generate do not consume. Distinct from **Edit current week**, from silent double-progression in **Hevy program sync**, from **First build** **Periodization**, and from **Progression**.


_Avoid_: Sync dialog summary, modifyProgram (tool), living-loop ad-hoc chat edit, eager cron generation, company-borne suggest for users who still have credits, a second suggest meter, charging both generate and apply, CSS blur of a full payload, regenerating a cached row after checkout, treating this as **First build** **Periodization**




### Hevy week copy


The live Hevy folder for an exported week that is not yet **Week complete**: this week's execution document when that folder still exists. Created by **Week Export**. Changed by **Edit current week** Sync or by edits in the Hevy app, not by Proxima's last write alone. Distinct from the **Program prescription**. If the linked folder is gone and the week is not **Week complete**, **Week preview** is the prescription again.


_Avoid_: Treating prescription as this-week SoT after Export; treating this as Proxima's last write rather than the live folder; using a **Week complete** week's folder as the plan




### Update program (deferred)


Write-back from **Edit current week** into the **Program prescription**. **Deferred to program versioning; not built.** Sync changes this week's **Hevy week copy**. **Edit program** changes the plan.


_Avoid_: Building it into Edit current week ahead of versioning, implying it from Sync




### Make into a program


Optional promote from an unlinked Hevy folder on **Hevy mirror** (**In Hevy**). That row has two actions: **Edit** (Hevy-only **Edit path**, no **Proxima program**) and **Make into a program**. Promote opens **New path** with that split loaded and runs the agent so it can expand/update the split into a full multi-week **Proxima program**. User then **Save**s as usual. Never required. Does not open the **Questionnaire gate**. After Save, the new program shows on **Program overview** like any other. Week 1 is not linked; **Week Export** of week 1 creates a new Hevy folder (the original split folder is not reused). The user is told to use that Export folder and may delete the original split folder.


_Avoid_: Silent one-week Save, forced re-Export of week 1, Update program, convert-without-agent, attaching the existing Hevy folder as week 1's **Program–Hevy link**, promote on a **Program–Hevy link** row, a second promote button inside **Edit path**, blocking promote behind the **Questionnaire gate**




### Hevy share import


**New path only** action that hydrates the builder from a public Hevy share link (folder, routine, or completed workout) as a **one-week seed**. Shared routines → days in week 0 only. A workout → a single day whose loads are what was actually lifted. Uses the same fetch + adapter as **Hevy share fetch**, then loads the adapted routines onto an **empty** grid after user confirm. Adapter strips foreign Hevy routine/folder IDs and assigns **builder routine keys**. Keeps titles, exercises, and sets. Does not require the **questionnaire** first. Questionnaire applies when generating/expanding, not when loading a share. Not **Edit path**, not Sync to the shared folder, and not a **Program-Hevy link**. Multi-week expand is a separate ask and is **First build** (same plate + **Periodization wave** as an empty-grid build). Distinct from **Make into a program**.


_Avoid_: Edit arrival, Hevy program sync, scraping the share HTML, Sync to share URL, auto-load on paste, auto multi-week on import, keeping share Hevy routine IDs, import while on Edit path, blocking import behind getMoreInfoQuestions




### Hevy share fetch


Read-only tool. Same private share request + adapter as **Hevy share import**, returned to Andy as structured routines (not raw HTML). Accepts `hevy.com/folder/...`, `hevy.com/routine/...`, and `hevy.com/workout/...` (a completed session log, not a prescription). For questions about a share, feedback on a logged session, or to weigh that split when planning a **new** program. Does not hydrate the builder. Available on **New path** and **Edit path**. Import is a separate confirmed **New path** step.


_Avoid_: Auto-import, Edit arrival, scraping the share HTML, raw unadapted JSON as the agent contract




### Hevy program (edit scope)


One Hevy routine folder and all routines inside it, the unit loaded from the dashboard grid and synced back on the **Edit path**. Not a multi-week **Proxima program**. Weeks are a Proxima layout layer only. Informal "split" often means this when there is no Proxima program.


_Avoid_: Program (ambiguous with Proxima program), folder (ambiguous), Split (overloaded with questionnaire preferred-split / splitType)




### Hevy routine folder ID


Stable Hevy-side identifier for the routine folder a program lives in. Persisted when entering Edit mode. Used as the POST target for new routines on Sync. Distinct from week index in the builder.


_Avoid_: folder_id (overloaded in code today), week folder




### Week index


Builder-only 0-based slot for which week a day belongs to in the program grid. Distinct from the 1-based program week and from the **Hevy routine folder ID**. Not a Hevy identifier.


_Avoid_: Hevy folder id, 1-based program week, treating a rename of the builder field as required for Sync




### Hevy routine


The plan for one day in Hevy: the list of exercises the athlete will do. A row in a folder, identified by **Hevy routine ID**. Distinct from a **Workout**, which is a history snapshot of a session already performed. Deleting routines does not delete **Workouts**.


_Avoid_: Workout, treating folder deletion as wiping history, using “day” when you mean a completed session


### Hevy routine ID


Stable Hevy-side UUID for one routine (one day). Set when a routine is loaded from the Hevy API or returned from a POST on Sync. Used for PUT and empty-on-remove. Stored as `hevyRoutineId`, separate from the builder routine key.


_Avoid_: id (ambiguous with dnd key), day id




### Builder routine key


Client-only integer identifier on a day in builder state (`id`), assigned sequentially for dnd and React keys in both New and Edit mode. Never sent to Hevy. New days and copies get the next integer. Duplicates and copies do not inherit a Hevy routine ID. The split is **uniform across every Edit entry**. A routine loaded from Hevy always arrives with an ordinal `id` and its UUID on **Hevy routine ID**, whether or not that folder has a **Program-Hevy link**. Absence of a Hevy routine ID therefore means one thing everywhere: this day does not exist in Hevy yet.


_Avoid_: id (when meaning Hevy), routine id (ambiguous), UUID dnd key, leaving the Hevy UUID in `id` on any Edit entry, identity that differs by how Edit was entered




### Builder exercise key


Client-only instance identifier on an exercise row in builder state, assigned sequentially for every create, load, and copy, parallel to **Builder routine key**. Never sent to Hevy or written to the **Program prescription**. A copy (duplicate day/week, insert of a new row) gets a new key. `exercise.index` is position only; this key is the row’s identity. **Proposal marks** are the keys captured at Accept.


_Avoid_: exercise.index as identity, exercise_template_id as instance id, remapping marks by slot, persisting this key to Hevy or Supabase




### Sync (Edit mode)


Hevy write from **Edit path**: empty removed **Hevy routines**, PUT updated ones, POST new ones. The toolbar button labeled **Sync** runs this on **Edit current week** and on Hevy-only Edit (no **Proxima program**). **Edit current week** also rewrites that week's live **Hevy routine IDs** on the **Program–Hevy link**. Hevy-only has no link. Does not write the **Program prescription**. Successful **Sync** navigates to profile.


_Avoid_: Week Export, Save (Supabase prescription), labeling this control **Save**, a second persist button, DELETE, a separate Hevy-only engine




### Sync completion (Edit mode)


After Sync finishes with zero failed operations, show a success toast, invalidate the `useHevyPrograms` React Query cache, then navigate. Toolbar Sync goes to the profile page. Leave-guard **Sync and Continue** goes to the user's original destination. The builder is not refreshed in place. The next Edit entry loads fresh routines from a refetched profile fetch.


_Avoid_: Post-sync cache, keep local state, in-builder reload, confetti




### Sync dialog


Dedicated `SyncDialog` for Edit mode. Confirmation with empty / update / add counts, inline progress with rate-limit retry (same pattern as Export), and **Rollback to previous version** when operations fail. Leave-guard **Sync and Continue** opens the same dialog in progress-only mode. Toolbar Sync uses the full confirm step first.


_Avoid_: Export dialog, save dialog




### Sync pipeline


Single Sync implementation used by the toolbar Sync button and by the leave-guard **Sync and Continue** action. Same diff, batch order, progress UI, and retry behaviour. Proxima custom exercises are resolved the same way as Export before PUT and POST operations.


_Avoid_: saveAndContinueSync, duplicate sync paths




### Sync batch order


Order of Hevy API calls during Sync: empty removed routines first, PUT updated routines second, POST new routines last.


_Avoid_: Diff order, sync pipeline




### Changed routine (Sync)


A builder routine with a Hevy routine ID whose content differs from the matching entry in `initialHevyProgram`. Only changed routines receive PUT on Sync. Unchanged routines are skipped.


_Avoid_: Updated routine (too vague), dirty routine




### New routine (Sync)


A builder routine with no Hevy routine ID. POST to Hevy on Sync, including when the day has zero exercises. An empty routine without the `[Removed]` prefix is a day still being built, not a removal.


_Avoid_: Added day, local routine




### Removed routine (Sync)


A routine whose Hevy routine ID is in `initialRoutineIds` but no longer appears in builder state. Sync PUTs it in Hevy: `[Removed]` title plus one placeholder exercise. Hevy PUT rejects `exercises: []` (HTTP 400: array must contain at least 1 element). Hevy API does not support DELETE on routines.


_Avoid_: Orphan, deleted day (ambiguous with UI action), hard delete




### Emptied routine (Hevy)


A routine left in the Hevy folder after Sync removed it from the builder program. Title set to `[Removed]` plus the original title (any existing `[Removed]` prefix stripped first). Notes (Hevy description) set to "You marked this routine for removal in Proxima. You can now delete this routine." Hevy keeps one placeholder set of the first remaining exercise because PUT rejects an empty `exercises` array. Skip the empty PUT when Hevy already matches that state. The prefix is the sole signal for an emptied routine. An exercise-less routine without the prefix may be a day the user is still building.


_Avoid_: Deleted routine, archived folder, empty routine




### Removed routine filter


On Edit load from Hevy, routines whose title starts with `[Removed]` are excluded from the builder, from `initialHevyProgram`, and from `initialRoutineIds`. Active routines only. Same filter after a successful Sync when snapshots are refreshed.


_Avoid_: Empty exercise filter, hide deleted




### Initial routine IDs


Snapshot of Hevy routine IDs for active (non-`[Removed]`) routines when Edit mode opens. Used on Sync to detect removed routines (empty via PUT). Held in builder session state for the current Edit session only. Absent in New mode.


_Avoid_: baselineHevyRoutineIds, editSession




### Initial Hevy program


Full routine snapshot of active (non-`[Removed]`) routines fetched from Hevy when Edit mode opens, the pre-edit truth. `[Removed]`-tagged routines are stripped before capture. Held in session memory alongside working builder state. Used for Sync rollback. Refreshed after successful Sync with the same filter. Not persisted via `hevy-program-in-progress`. Not used for resume.


_Avoid_: hevy-program-in-progress (Edit path), backup file, raw folder pull




### Edit session


An in-progress **Edit path** builder load tied to one **Hevy program (edit scope)** (and, on **Edit current week**, to one week of a **Proxima program**). Sync writes Hevy only, the **Hevy week copy**. The **Program prescription** is changed through **Edit program** (**Update program** write-back from Edit current week is deferred). When no Proxima program is attached, Hevy is the sole source of truth. Session state (`initialHevyProgram`, `initialRoutineIds`, `initialFolderId`, working routines, edit dirty state) lives in an `EditSessionProvider` while Edit arrival is active.


_Avoid_: Draft (ambiguous with New-path localStorage draft), edit state




### Builder draft


Local resume copy in `hevy-program-in-progress` for **unsaved** New-path work only (crash recovery, anon, **Sign-in return**). Holds the program. Cleared on successful **Save** or Discard. After Save, Supabase **Proxima program** is SoT. Edit path does not read or write this key. Does not hold **Proposal marks** — resume has no undo stack, so those marks are not restored.


_Avoid_: Dual-write forever after Save, Edit session payload, treating draft as Program overview source




### Edit navigation guard


When the user has unsaved Edit-mode changes and tries to leave the builder, including switching New ↔ Edit in the mode menu, block in-app navigation and show a dialog with **Sync and Continue** (run Sync progress immediately, then navigate to the user's original destination on success) and **Discard** (drop local changes and navigate without touching Hevy or invalidating cached profile data). Dismiss (X) stays in the builder. Implemented via `useEditLeaveGuard()` (`beforeunload` + `guardNavigation()` on documented exit points: sidebar, breadcrumbs, mode menu, etc.). Tab close or refresh uses the browser `beforeunload` prompt when dirty. It cannot offer Sync. Edit mode never resumes from `hevy-program-in-progress`. The next Edit entry always loads from the profile routines fetch.


_Avoid_: Unsaved changes warning (too generic), Save and Continue (Save is prescription persist), Sync change summary in the leave dialog




### Initial folder ID


The Hevy routine folder ID captured when the user opens a Hevy program for editing. Used as the POST target for new routines on Sync. Held in builder session state (not persisted for Edit resume). Distinct from week index on each routine.


_Avoid_: hevyRoutineFolderId, folder_id (week index)




### Sync rollback


Restore the user's Hevy account to the initial Hevy program after a failed or partial Sync. Diff current Hevy state against the initial snapshot. Reverse changes surgically: PUT restored routines, POST routines that were emptied, empty routines that were created during the failed Sync. Each rollback operation retries with exponential backoff until complete (same discipline as Export upload). User-triggered only via **Rollback to previous version** in the Sync progress UI when one or more Sync operations failed. After a successful rollback, invalidate `useHevyPrograms` and navigate to the profile page.


_Avoid_: Undo, revert changes, re-POST duplicates, DELETE, in-builder reload




### Hevy reload (Edit mode)


After a successful Sync, invalidate `useHevyPrograms` and leave the builder for the profile page. After a successful rollback, same pattern. Edit entry loads routines passed from the profile fetch, not from `hevy-program-in-progress`.


_Avoid_: Baseline advance, in-builder reload, resume draft




### Edit arrival


Entering the builder to modify an existing Hevy program, via `/build-program?edit=true&hevy=true&folder={initialFolderId}`. On Edit click from the profile (**Hevy mirror** subsection or blind-spot Hevy program picker), refetch `useHevyPrograms`, then pass the selected program's routines through router navigation state. Optional query params (e.g. `search=` for stall-analysis dispatch) compose with Edit arrival. The build-program page hydrates from navigation state and does not fetch routines on mount. If navigation state is missing (refresh, direct URL), redirect to the profile page. Not seeded through `localStorage`.


_Avoid_: Resume, hevy-program-in-progress (Edit path), build-program fetch




### Edit mode menu


The breadcrumb New/Edit switch. Edit is only selectable when the builder is already on an Edit arrival (`folder` param present). Entering Edit from New is via **Hevy mirror** on the profile, not the mode menu.


_Avoid_: Mode toggle, program picker




### Edit agent


The chat agent has the same program-building tools in Edit mode as in New mode. Standalone agent edits are a **Mutation proposal**; Accept updates working builder state and sets edit dirty. **First build** still lands immediately. The user Syncs to push changes to Hevy.


_Avoid_: Read-only chat, constrained edit tools, auto-apply live-grid edits without a **Mutation proposal**




### Template swap


Replacing one exercise template with another across some or all days and weeks of a program, e.g. barbell → dumbbell for every occurrence. Preserves existing sets and rest when the swap is equipment-only. Distinct from editing a single slot's prescription (reps, RPE, rest) or replacing one day's exercise with new set targets.


_Avoid_: Exercise edit (ambiguous, may mean one slot or program-wide), variation change (too vague)




### Program mutation batch


One ordered set of program changes the agent sends in a single turn for one logical edit. Fail-all: if any change is invalid, none apply. On an existing program the batch is a **Mutation proposal** until Accept.


_Avoid_: Patch, JSON edit




### Mutation proposal


A **Program mutation batch** the coach wants to apply to an existing program, shown in chat until the user Accepts or discards it. Accept commits it to the in-memory builder. Reject, a new user message, or a stale fail-all discards it. Distinct from **First build**, which still lands immediately. Distinct from **AI week suggest**, whose Apply writes the **Program prescription** on Program overview.


_Avoid_: Accept step, line diff, Cursor diff, Apply (the **AI week suggest** button), patch preview, auto-apply on ready




### Proposal mark


Leading-gutter hash on a still-present builder exercise row whose **Builder exercise key** was captured at the last accepted **Mutation proposal**. A reserved 4px rail sits left of `#` / trash on every builder row while that Accept is still undoable, so unmarked rows do not shift. The hash is one accent (teal), opposite the superset right border, and is not a title-cluster bullet. Follows the row when its index moves. Lives on **New path**, **Edit program**, and **Edit current week**. Not restored with the **Builder draft**. Absent on first build, a pending proposal, manual-only edits, **AI week suggest**, and on deletes or day/week ops that leave no exercise row.


_Avoid_: Last pass, dirty indicator, line diff, ghost row, unread badge, week-header hint, row tint, title-adjacent bullet, restoring marks without Undo, **Changed routine (Sync)**




### Proposal jump


Tapping a current-review **Mutation proposal** recipe line that names a still-present exercise scrolls that builder row into view, including switching the visible week on mobile. Current-review means the pending proposal, or the last accepted one while **Proposal marks** are live. Not tappable after persist, on older cards once a newer Accept has replaced marks, or when the line has no still-present row.


_Avoid_: Jump after Save/Sync, jump on historical cards, jump with no row, jump on first build, line diff




### Soft tool failure


A coach tool (`buildProgram`, `mutateProgram`, etc.) returns a structured error while the chat stream can continue. The model gets fix text and may retry in-turn. The first miss of an honor id this turn is calm in-progress copy for ordinary users. The second of the same id is a **Program stalemate**, not a third hidden retry. Full raw tool error UI is **Agent debug mode** only. Client always emits PostHog `ai_tool_error` (even when UI is calm). Distinct from a dead turn and from **Hard agent failure**.


_Avoid_: Tool crash (implies hard fail), validation error shown to user, treating soft reject as generation failure, Workout generation failed on a Soft tool failure




### Hard agent failure


The chat stream dies (network, payload too large, provider/gateway kill, Vercel function `maxDuration`). Surfaces recovery UI and `ai_agent_error` (with `errorClass` when known). Not a Soft tool failure. Not an empty-grid wall-clock timer while Andy is still Soft-failing.


_Avoid_: Soft tool error panel, rate limit (usage cap is a separate 402 path), An error occurred (opaque SDK default, not a product term), Workout generation failed because no week landed in 120s




### Agent error class


Short stable code on hard failures for PostHog / stream `onError`: `provider_error`, `validation_error`, `stall_timeout`, `payload_too_large`, `network_error`, `gateway_auth`, `unknown`. Soft tool failures use the tool `error` string as `errorCode` instead.


_Avoid_: Free-form provider HTML in analytics, dumping full programs into event props




### Agent debug mode


Test-user-only toggle that reveals Soft tool failure panels (`ToolErrorPanel`) in the builder chat. Off by default. Ordinary users never see those panels.


_Avoid_: Developer mode (too broad), always-on tool errors, production error dumps for all users




### Edit dirty state


Whether the current Edit session has unsaved builder changes. Set by any mutation (grid edit, agent patch, undo). Cleared on successful Sync, Discard, or fresh Hevy load. Drives the navigation guard. Page refresh shows a browser `beforeunload` warning when dirty. If the user proceeds, unsaved Edit state is lost and the next Edit entry reloads from Hevy.


_Avoid_: isDirty (implementation), unsaved flag




### Program versioning


History of a **Proxima program** over time in Supabase. Belongs to the **New path** / Program overview lifecycle (PRO-102 / PRO-176), not to Hevy-only **Edit path** Sync.


_Avoid_: Save (persist current), Sync (Hevy push)




### Hevy sync module


Edit-mode Sync and rollback logic lives in `hevy_sync.ts` with colocated tests. `hevy.ts` retains HTTP primitives (`putRoutine`, `postRoutine`, `defaultPut`, etc.).


_Avoid_: syncProgramToHevy in hevy.ts, export sync




### Edit navigation hook


Shared `useNavigateToEditHevyProgram()` used by profile entry points (**Hevy mirror** subsection, blind-spot Hevy picker). Refetches `useHevyPrograms`, passes routines via router state, and navigates to Edit arrival with `folder` and optional extra query params.


_Avoid_: navigateToEditHevyProgram helper, inline edit push




### Agentic memory


What the integrated training coach persists about the user across sessions and can use when coaching. Inspectable and editable by the user on **Edit profile**. Edit-profile umbrella with subsections: **Constraint profile**, **Training profile** (structured person facts), and **Body measurements** (read from **Body measurements backup**, not freeform notes). Constraint profile and Training profile are separate user-scoped structured records. Body measurement history is a separate backup like workouts. Prompt inject covers Active Constraint Profile, Active Training profile, and latest body measurement when present.


_Avoid_: Memories (implies freeform-only rows), agent knowledge (too vague), user preferences (too broad), folding person-facts into Constraint profile, stuffing body-measurement history into the Constraint profile row, Agent memory (use Training profile), Session episode (removed, not a kind)




### Training profile


Agentic-memory kind for durable structured facts about the user that are not training constraints and are **not** covered by Hevy **Body measurement** fields. v1 fields: **age** (integer years, 14-100, not date of birth), **sex** (male / female / prefer not to say, prefer-not-to-say and unset are the same empty value, not a third stored sex), **height**, experience level (beginner / novice / intermediate / advanced), physique phase (bulk / cut / maintain / recomp), **training focus**, activity level (sedentary / light / moderate / high / extreme, short forms, not questionnaire "light activity" labels), session duration cap (10-180 minutes in 10-minute steps). Height is stored canonical as centimeters. Questionnaire advanced and Edit profile use an **Imperial / Metric** toggle (Imperial → ft + in wheel; Metric → cm) and convert to cm on save. Anything present on a Hevy body-measurement entry (weight, lean mass, fat %, girths, etc.) lives only in **Body measurements backup**, never duplicated here. Filled from Questionnaire advanced and editable on Edit profile as its own subsection under Agentic memory. Persisted in its **own** user-scoped store, separate from the Constraint profile store, with the same product patterns (Edit-profile Save, agent **updateTrainingProfile** tool, prompt inject) but not the Mutation constraint gate. Mid-chat: agent may set fields when the user states them. Clear or change only on a clear user statement (same spirit as **User-stated change**). A user ask in builder chat to fill or edit Training profile (including "update my profile" / "edit my info") opens the person-fact **Questionnaire gate** questions only; that submit persists and does not build. An empty Training profile does not reopen the first-time or returning-program gate. Anonymous: Questionnaire advanced still collects answers for the session. **Persist only when signed in** (same as Constraint profile). Specific weekdays are out of scope (builder cannot enforce them).


_Avoid_: Agent memory (deprecated name), Constraint profile (wrong kind), athlete profile (informal duplicate), user bio (identity section), chat refinements (constraint-adjacent freeform), Session episode (removed), freeform remember-this notes (v1 out of scope), sharing Mutation constraint gate, weekday schedule memory, duplicating Hevy body-measurement fields (weight, lean mass, fat %, girths), storing height as feet/inches only, merging Training profile into the Constraint profile table, Edit-profile-only Training profile with no chat update path, storing date of birth instead of age, reopening the full Questionnaire gate because Training profile is empty, building a program from a Training-profile ask submit




### Constraint profile


Merged training constraints for one user, home-prompt inference plus questionnaire answers plus later chat. Authoritative for exercise selection and program edits. Agent must not re-ask fields already captured here. Chat may add freely when it recognizes a new constraint. It may remove or relax only on a **User-stated change**. Chat writes do not reopen the **Questionnaire gate**. Unconfirmed gym-default excluded equipment is not a captured profile. One kind of Agentic memory, stored separately from **Training profile** (person facts). When a persisted row exists, array fields (injuries, excluded equipment, excluded areas) and preferences are **persisted-only**. Merge does not re-union with stale questionnaire/session strings, so Edit profile and agent clears stick across chat turns. New questionnaire array or preference values for users who already have a row must arrive via chat `updateConstraintProfile` or **Edit profile** Save, not merge alone. When the user manually edits the profile (add, change, or remove), those edits supersede questionnaire answers and chat session inputs that would put a removed constraint back. On **Edit profile**, the Constraint Profile UI maps 1:1 to persisted fields (injuries, excluded equipment, excluded areas, preferences, raw statements), not renamed umbrella labels, mirroring **Questionnaire core** (not Questionnaire advanced). Structured fields are editable. **Raw statements** are the user's exact words captured on agent updates, view and delete only (not freeform invent), so the user can purge wrong audit lines. Deleting a raw statement does not change injuries, equipment, areas, or preferences. Those are edited separately. Constraint profile changes use a dedicated Save (separate from identity Save and from **Training profile** Save). Nothing persists until that Save. On Edit profile, **Injuries & health issues** accept freeform add. Excluded equipment and excluded areas use fixed pickers (questionnaire option sets). All list fields support remove. Preferences use the same option sets as the questionnaire (not freeform).


_Avoid_: User preferences (too broad), questionnaire data (implementation-shaped), builder state, constraints (UI label), Other constraints (non-column label), single shared Save with identity, autosave per chip, freeform invent for equipment/areas, freeform preference text, merge re-union of arrays or preferences when a row exists, session-wins preference merge when a row exists, different field sets on questionnaire core vs Edit profile Constraint section, person-facts that belong in Training profile, merging Constraint profile storage with Training profile, treating gym-default excludes as a Constraint profile, reopening the Questionnaire gate on conversation change




### Body measurement


One dated body-metrics entry for a user, weight, lean mass, fat %, and girths (neck, shoulders, chest, biceps, forearms, abdomen, waist, hips, thighs, calves, etc.) as provided by the connected app. Canonical units metric (kg / cm). Source of truth after sync is Proxima's backup, not live Hevy per request. These fields are excluded from **Training profile** so there is a single source per metric.


_Avoid_: Body stats (too vague), check-in (informal), profile weight (ambiguous), copying measurement fields into Training profile




### Body measurements backup


Proxima's stored copy of the user's **Body measurement** history, synced from connected fitness apps the same way **Workout history backup** syncs workouts. Full backfill when Hevy is connected, then ongoing sync for new/updated entries. Canonical grain: one row per dated measurement entry per user. **Edit profile** Agentic-memory **Body measurements** subsection is **read-only** in v1. Shows latest and/or history from this backup. No manual add/edit. Not stored as columns on the Constraint profile / Training profile user-scoped stores. Coach access: inject a short **latest** measurement summary into the system prompt when a backup entry exists. On-demand history via an agent tool (same spirit as **Agent workout history tool**) when the user asks about trends or past check-ins.


_Avoid_: Hevy live fetch for coaching, embedding measurement arrays on the constraints row, one-shot latest-only with no history table, manual body-measurement entry on Edit profile (v1), dumping full measurement history into every prompt




### Agent body measurements tool


Pro-only chat tool that returns backed-up **Body measurement** entries from Supabase (limit / date window). Used when the user asks about weight or girth trends over time. Not a substitute for the latest-summary prompt inject (which remains available whenever backup data exists). Backup sync and Edit-profile read-only view stay free. Distinct from **Agent workout history tool**.


_Avoid_: Live Hevy body fetch in chat, getWorkoutHistory for measurements, free unlimited history tool for free tier




### Training focus


Single Training-profile field for what the user is training toward. One structured single-select choice that replaces both a vague "primary goal" picker and a separate specialization picker. v1 catalog: bodybuilding, powerbuilding, powerlifting, hyrox, crossfit, olympic weightlifting, calisthenics / bodyweight, athletics / sport, fat loss, general fitness, rehab / pain-aware. Drives skill/resource selection and program framing. Not a Constraint profile field.


_Avoid_: Primary goal (ambiguous duplicate), specialization (duplicate when used alongside goal), goalsOptions kitchen-sink list, multi-select training focus




### User-stated change


The user asserts that a Constraint profile rule or Training profile person fact no longer applies — e.g. injury healed, equipment acquired, area no longer excluded, Preferred split dropped, deload preference cleared, age or sex prefer-not-to-say. Grounded in the user's words (this turn or a clear recent statement), not in the agent's preference for a program style. Agent may remove or relax constraints and clear preference / Training fields only on a User-stated change or via **Edit profile**. Preference clears use `preferences.<key>: null` (stored as empty); array clears use `removeInjuries` / `removeExcludedEquipment` / `removeExcludedAreas`; Training clears use field `null`. Never clear to make a preferred split or exercise set feasible. Replacing a preference with another catalog id (e.g. Full Body) is a set, not a clear. Program length and days per week are not Agentic memory clears.


_Avoid_: Explicit request (implies confirm UI), agent-inferred removal, program-pressure override, swapping to Full Body / fb as a wipe, clearing program length or days per week via Constraint or Training tools




### Mutation constraint gate


Hard check on agent-proposed program changes against structured Constraint profile fields that a **Hevy exercise template** can match on equipment or primary muscle group (excluded equipment, excluded areas, injuries that name a muscle group) plus structural rules such as no emptied training days. Runs before those changes reach the builder. Does not apply to manual grid edits or Sync. Those honor the user's explicit program state. Does not cover Constraint profile preferences, semantic health limits the string miss, or Training profile. Those are **Program sanity check**.


_Avoid_: Sync validator, ConstraintAwareMutation (ticket name), advisory prompt-only check, treating the gate as a full Constraint profile lock




### Program sanity check


Named check on a proposed program snapshot before it lands on the builder (**First build** or **Program mutation batch**). **First build** is judged on the full periodized program after the **Periodization wave** is applied, not on week 1 alone. Later batches only re-check what the new work can break (injury, equipment, warmup). Code owns schema, ids, empty days, week-coverage (later-week mains still matching week 1 fail **First build** unless a **Program stalemate** same-week skip this build), and claimed deload / peak hardness vs the prior week. Injury and excluded-equipment semantic checks are per unique exercise title × each saved string on that snapshot. Other Constraint profile preferences and Andy-authored Training profile fit may **Soft tool failure** until a **Program stalemate**. Skill phase-honor questions (`stimulusHonor`, `weekIntentHonor`, `periodizationCoverage`) do not Soft-fail **First build**. Does not run on manual grid edits or Sync.


_Avoid_: Program verdict, catalog entry, scorecard (`rateProgram`), Mutation constraint gate (the substring/empty-day subset only), Jev on a week-1-only land without the wave, one blob injury/equipment question for the whole grid, `constraint.progressionHonor` as a **First build** question, Jev grading Accumulation / Peak from title + set count + RPE alone




### Program stalemate


Andy and a **Program sanity check**, **Mutation constraint gate**, or week-coverage miss disagreed twice on the same honor id or error code this turn. Nothing lands. Injury and equipment pair misses name the lift and the saved limit; the user may remove that Constraint profile string (**User-stated change**) or ask Andy to replace the lift. Preference honors offer clear-preference actions. Week-coverage and Training/skill misses keep their existing choices (same-week skip this **First build**, **User-stated exception**, or a different ask). Distinct from a hidden Soft tool failure retry and from **Hard agent failure**.


_Avoid_: Workout generation failed, Jev popup, retry dialog, Soft-fail escalation, honor check (the question ids), landing a rejected week to dodge a timer, asking the user to drop body limits without naming the conflicting lift




### User-stated exception


The user named a program outcome that would fail a Training profile or skill-principle **Program sanity check** (short day, skip a deload Andy invented, delete a lift they do not want, every week the same). Those checks do not reject. Skipping **Periodization** is this, not a skipped **Questionnaire advanced**. A **Program stalemate** "same week every week" choice skips week-coverage for that **First build** only. Constraint profile and the **Mutation constraint gate** still reject until a **User-stated change** or **Edit profile**.


_Avoid_: User-stated change (that term is for removing a saved constraint), taste override of a hard constraint, slapping the user for an explicit ask, skipped **Questionnaire advanced** as a same-week skip




### Injuries & health issues


Constraint profile list for injuries, pain, and how or where the user can train (can't kneel, no overhead, no floor). **Questionnaire core** health issues and mid-chat health limits write here. Edit profile caption. New chat writes must not add an entry that merely restates an existing one in different words.


_Avoid_: Chat refinements, Restriction tag, a second movement-restriction list, Injuries (label without health), stacking near-duplicate strings for the same limit




### Chat refinements (removed)


Former Constraint profile freeform list for leftover chat lines. Dropped. Health and movement limits belong in **Injuries & health issues**. Program-style notes do not persist on the user.


_Avoid_: addChatRefinements, using it as a junk drawer, Restriction tag as its successor




### Session episode (removed)


Former hidden LLM summary of a builder chat. Dropped. Not a kind of **Agentic memory**. Durable facts stay on **Constraint profile**, **Training profile**, and **Body measurements**. Cross-chat freeform notes stay out of scope.


_Avoid_: episodic memory, Previous Session Context, summarize-episode, a fourth Agentic-memory kind




### Equipment constraint


Hybrid equipment rule within the constraint profile: excluded equipment types (questionnaire) plus explicitly available equipment (home prompt, chat). Exercise selection must satisfy both, excluded types out, available types in. Distinct from a single "cables only" label. Captures setups like cable machine plus bench attachments.


_Avoid_: Exclude equipment (exclusion half only), gear list (too informal)




### Available equipment


Positive half of the equipment constraint, what the user explicitly has (e.g. cable machine, adjustable bench, attachments). Complements excluded equipment from the questionnaire. Both apply together. **Deferred** as a first-class Constraint profile / questionnaire field until **Gym profile** ships. Not stored as a leftover chat line.


_Avoid_: Allowed gear (informal), equipment list (ambiguous with full Hevy catalog), adding available-equipment questionnaire now ahead of Gym profile




### Gym profile


Future capability: named gym/setup profiles that gate exercise choices by where the user is training (home gym vs commercial, equipment on hand). Distinct from excluded-equipment questionnaire answers and from **Training profile**. Out of scope for the current questionnaire / Agentic-memory pass. Will supersede ad-hoc available-equipment lists.


_Avoid_: Available equipment (partial precursor), location (too vague), Hevy gym




### Movement restriction


How or where the user can train, e.g. no floor, no kneeling, no overhead. A kind of **Injuries & health issues**, not a separate store.


_Avoid_: Chat refinements, Restriction tag, treating it as distinct from injuries




### Restriction tag


Rejected. Canonical flags for movement limits were never shipped. **Injuries & health issues** plus **Program sanity check** cover that job.


_Avoid_: Building tags as a successor to chat refinements




### Exercise objection


User pushback on one programmed movement: pain, equipment mismatch, cannot perform a position, or wrong stimulus. Lasting limits write the **Constraint profile** (`addInjuries` or `addExcludedEquipment`). Taste or an explicit "remove / skip / I don't want that" may delete the row. An empty training day is still rejected.


_Avoid_: Complaint (too informal), exercise feedback (too broad), never-remove-alone, force swap on every dislike




### Questionnaire gate


New path footer survey. Opens for exactly three reasons: no real **Constraint profile** (first-time: **Questionnaire core**, **Questionnaire advanced** collapsed); a returning new-program request that omitted program length and/or days per week (those questions only); or a user ask in builder chat to fill or edit **Training profile**, including "update my profile" / "edit my info" (person-fact questions only; submit does not build). The question list is those reasons, not the agent's judgment. Chat-written Agentic memory does not reopen it. Gym-default excluded equipment is not a Constraint profile. After submit or "Build my program" on a build path, the agent must not re-ask captured fields. Unanswered advanced does not block build. First-time skip suppresses the first-time open for this chat; dismiss hides it without building. Returning length/days has no skip; dismiss does not build. New chat or visit: first-time again if there is still no Constraint profile.


_Avoid_: Intake form (UI-shaped), onboarding questionnaire, pre-build questions (too vague), always-full catalog, reopening because Training profile is empty, reopening on conversation change, agent-chosen extra questions, gym-default excludes as a Constraint profile, skip on returning length/days, building on dismiss, building on a Training-profile ask submit




### Questionnaire core


First-time **Questionnaire gate** questions: program length, days per week, excluded equipment, health issues. Enough to build safely. Prefill from this request. Not shown on a returning length/days open or a Training-profile ask. Style and person-fact prefs stay in **Questionnaire advanced**. Constraint fields still editable later under **Edit profile**.


_Avoid_: Always-visible (first-time only), primary questions, required questions (advanced is optional to expand, not a second gate), main form, stuffing the core with periodization/style prefs, treating gym-default excludes as answers they gave




### Questionnaire advanced


Collapsed-by-default on the first-time **Questionnaire gate**. Programming style prefs (excluded areas, preferred split, exercise variability, deload week, peak week, warmup exercises → **Constraint profile**) plus person facts (age, sex, height, experience, physique phase, training focus, activity level, session duration → **Training profile**). Progression system is stored with those style prefs but is **Progression**, not **First build** **Periodization**. Empty advanced is still a **First build**: Andy still authors a **Periodization wave** on `buildProgram` (required), not a same-week program and not a code-invented wave. First-time users can ignore and still build. Prefill person facts from an existing Training profile when present. A Training-profile ask opens the person-fact subset alone, not style prefs and not **Questionnaire core**.


_Avoid_: Extra questions, optional questionnaire (implies skip-all), advanced settings (app-settings shaped), stuffing Training profile answers into Constraint profile, opening advanced because the agent wants person facts, treating skipped advanced as no **Periodization**, treating progression system as the **Periodization wave**, server default wave when advanced is empty




### Hevy workout history


The user's completed Hevy workouts, full logs (title, timestamps, exercises, sets). Canonical copy lives in Proxima's workout history backup after sync. Agent and Blind Spot read from there, not live Hevy per request. Distinct from Hevy's per-exercise history API and from program workout days in the builder.


_Avoid_: Exercise history (Hevy API term, derived view)




### Workout history backup


Proxima's stored copy of a user's completed **Workouts**, from Hevy sync and from the **Public API**. Hevy: full backfill runs in the background when first connected (all tiers, pre-stages data before Pro); the connect dialog closes immediately; ongoing sync uses workout-count delta, **backed-up workout revision**, plus on-demand refresh when Blind Spot or the agent reads history. Public API: the caller POSTs a completed session that matches the Public API schema. Canonical shape: workout → exercises → sets. Supersedes legacy `workout_history` / `workout_history_exercises` tables, which are removed once canonical storage ships.


_Avoid_: Hevy sync (implementation), exercise_history backup (wrong grain), blocking connect flow




### Backed-up workout revision


Re-sync of one existing backup **Workout** when the connected app reports a newer version of the same external workout ID (e.g. user edited sets or title in Hevy after initial import). Runs during ongoing workout history backup, not a separate user action. Bounded to recent history on routine sync. Older edits rely on **Workout history fresh sync**. Distinct from count-based delta, which only detects net-new workouts.


_Avoid_: Upsert (implementation), workout edit (ambiguous with builder Sync)




### Workout history fresh sync


User-initiated full reset of one user's **Workout history backup**. Wipe all backed-up **Workouts** for that user, then re-run full Hevy backfill from scratch. Escape hatch when bounded revision window is insufficient (e.g. user edited a workout older than recent history). Requires explicit confirmation. Destructive to Proxima backup only. Does not modify the Hevy account.


_Avoid_: Re-sync (ambiguous with revision), clear cache (implementation)




### Workout (backup)


One completed session in workout history: what they actually lifted. Identified by **Workout source** + external ID. Written by Hevy sync or by the **Public API**. A Public API POST with the same identity does not overwrite; PUT replaces; DELETE removes. Not a **Hevy routine** (the plan for a day). Deleting routines in Hevy leaves **Workouts** in place.


_Avoid_: Session (use workout), workout log (deprecated term), program day




### Workout exercise


One exercise performed within a backup workout, ordered rows linking to a canonical exercise. May include logged **notes** and **superset_id** from the source app (for display in workout history browse). Distinct from canonical exercises, builder slots, and Hevy exercise templates.


_Avoid_: Exercise (ambiguous, specify canonical, builder, or workout exercise)




### Set (backup)


One logged set within a workout exercise, weight, reps, RPE, duration, distance, set type, etc. Normalized columns, not app-native JSON.


_Avoid_: Builder set (prescription), program set (planned)




### Canonical exercise


Cross-app movement identity in Proxima, name, muscles, equipment. **Global canonical** rows (`user_id` null) include the shared Hevy library seed and **Proxima supplemental** customs, readable by all authenticated users. Distinct from **Custom exercise** (user-owned, `user_id` set, RLS-gated).


_Avoid_: Catalog exercise (deprecated term), Hevy exercise template (app-specific), workout exercise (instance in a logged workout)




### Proxima supplemental


Shared custom exercises Proxima added to the exercise library (e.g. warmup templates), flagged `is_proxima_supplemental` on the template mirror. Stored as global canonical rows (`user_id` null). Readable by all users. Distinct from **Custom exercise** (one user's Hevy app creation).


_Avoid_: Warmup exercise (examples only), export custom (process not identity)




### Custom exercise


User-owned exercise identity, created in the user's Hevy app (**Hevy-native custom**), minted on that account when exporting a non-supplemental custom (**Proxima-exported custom** with a per-account Hevy ID), or created through the **Public API**. Public API create requires title, exercise type, equipment, and primary muscle group (same contract as the in-app Hevy form). Stored as `canonical_exercises` with `user_id` set. RLS: readable only by that user. Distinct from **Proxima supplemental** (shared, `user_id` null).


_Avoid_: Custom movement (old term), user exercise (too generic)




### Exercise source mapping


Link from an app-specific exercise ID (e.g. Hevy template UUID) to a canonical exercise. One canonical exercise may have many mappings across sources. Used when importing workout history from connected apps. Canonical exercises are seeded from Hevy templates deduped by `normalized_title`. New templates get a lazy mapping on first sync if missing.


_Avoid_: Exercise FK (implementation), template id (Hevy-shaped), catalog (deprecated term)




### Blind spot analysis


Profile feature that surfaces exercises where logged performance has stalled or regressed, and routes the user into the builder to fix plateaus. Reads the workout history backup (not live Hevy). Free tier: limited preview (last 15 performances per exercise). Pro: full synced history for analysis, trends, and stall dispatch. Pro-gated for depth, not for backup sync itself.


_Avoid_: Stall detection (implementation), exercise stalls (UI component name)




### Workout history browse


Profile **Recent Workouts** section, horizontal feed of backed-up **Workouts** as read-only logged day cards (title, date, duration; up to 5 exercises per preview card). Includes every **Workout source**, not Hevy only. **See more exercises** opens **Logged workout detail** when a workout has more than five exercises. Free for all users with backup data. Cursor-paginated load-more over full history. Page refetches as new **Workouts** arrive. Distinct from blind spot analysis (stall detection) and from profile statistics (weekly aggregates). Placement and card shell per profile Hevy layout ADR.


_Avoid_: Workout history (ambiguous with backup or Hevy API), exercise history (Hevy API grain), sync banner (progress only)




### Logged workout detail


Full read-only view of one backed-up **Workout** at `/workout/{id}` (`{id}` = Proxima backup UUID). Metadata block (title, date, duration, source badge, **Session goal** badge when classifiable, exercise/set counts, back to profile) plus full logged day card with all exercises and sets. Profile card shell on muted background. Dedicated 404 when missing or not owned. Distinct from workout history browse (5-exercise preview cards on profile).


_Avoid_: Workout page (ambiguous with builder day), Hevy workout URL (external app)




### Workout history access


Reading backed-up workouts for product features (workout history browse, blind spot analysis, agent tool). Any **Workout source**. Pro-gated for agent queries and full blind spot depth. Browse and retention are free for all users with backup data so upgrade unlocks existing data immediately.


_Avoid_: Hevy API access (live fetch), export (program push to Hevy)




### Agent workout history tool


Pro-only chat tool that returns recent backed-up workouts from Supabase. Agent chooses how many workouts to pull (cap ~30). Optional filters by date or canonical exercise. Workout-scoped only in v1. No separate exercise-history tool.


_Avoid_: getExerciseHistory (v1 scope), live Hevy fetch in chat




### Profile statistics


Hevy-style aggregate chart on the profile page. Weekly Duration, Reps, and Volume totals derived from the workout history backup, with a time-range filter (last 4 weeks or last 12 weeks). Headline above the chart always shows the current Sun-Sat week total for the active tab (Duration, Reps, or Volume), independent of the chart range. When at least one prior week of backup exists, a **Profile consistency line** appears under the headline, current-week workout count and trailing average workouts per week. Duration uses workout wall time (`ended_at - started_at` per workout, summed by week). Reps uses total reps across all sets in each week (null reps excluded). Volume uses the sum of `weight_kg × reps` per set in each week (null reps excluded; zero or null weight contributes 0, same rule as blind spot session volume). Volume is stored in kg. The UI shows the user's preferred weight unit. Weeks bucket by `started_at` using Sunday-start calendar weeks (US convention). Free for all users with backup data, not Pro-gated. Includes every **Workout source**. Distinct from blind spot analysis (per-exercise stall detection) and from the header workout count (lifetime total).


_Avoid_: Workout stats (ambiguous with header count), activity chart (too generic)




### Profile consistency line


Muted subline under the **Profile statistics** "This week" headline, `{N} workouts · {avg} avg/wk`. N is backed-up **Workout** count in the current Sun-Sat week (live as the week progresses). avg is the mean workouts per week over the prior weeks in the active chart range (last 4 or last 12 weeks, current week excluded; zero-workout weeks in that window count as 0). Hidden when no prior weeks of backup exist. Shown regardless of active Duration/Reps/Volume tab. Updates when the chart range changes. Distinct from **Training streak** (consecutive trained weeks in the header).


_Avoid_: Consistency score (too vague), on-track label (deferred judgment copy)




### Profile calendar


Month grid beside **Profile statistics** on the profile (Sunday-start week row, US convention, same as profile statistics). One highlighted day per calendar date that has at least one backed-up **Workout**, using the same local workout date shown on workout history browse cards (workout start, not finish). One highlight per day regardless of how many workouts that day. **Today** (user's local calendar date) always gets a distinct ring outline. When today also has a workout, the teal workout circle keeps its fill and adds a contrasting ring. User can navigate to any month across full synced backup history (independent of profile statistics' 4/12-week chart range). Highlights load per visible month and refill silently as backup sync adds workouts (no sync status copy on the calendar card). Month navigation is unbounded. Empty grids before the first workout or after today are allowed. Future months show no highlights. Hovering, focusing, or tapping a highlighted day opens the same tooltip (tap-to-open on touch; dismiss on outside tap) listing each backed-up **Workout** that day, title, duration, date, and a **See Workout** link to **Logged workout detail**, stacked when multiple sessions share a date. Opens on the current calendar month by default. Free for all users with backup data (not Pro-gated). Shown when the user has backed-up **Workouts** (same gate as **Recent workouts**). Distinct from profile statistics (weekly Duration/Reps/Volume aggregates).


_Avoid_: Activity calendar (too generic), workout calendar (ambiguous with builder schedule)




### Profile header


Top identity block on the profile page: avatar, @username (primary), display name (secondary), bio, Edit profile, and stat row (Workouts, **Training streak**, Followers, Following when Hevy connected; Workouts, Followers, Following when not). Stat row uses Hevy layout, label above number. Workouts stat folds in backup sync state (count when caught up; fraction + status dot when syncing/paused/error; inline pause/play icon when syncing or paused). **Training streak** is a fourth stat when Hevy connected, consecutive Sunday-start weeks with at least one backed-up **Workout**, counting backward from the most recent trained week. An in-progress current week with zero workouts does not break the streak until the week ends empty. Hevy-parity layout. No photo banner.


_Avoid_: Profile hero (implementation component name), user card (too generic)




### Training streak


Consecutive Sunday-start weeks (US ET, same as profile statistics) with at least one backed-up **Workout**. Count walks backward from the most recent week that qualifies. The in-progress current week is ignored when empty (grace until the week closes). Shown as the **Streak** stat in **Profile header** when Hevy connected, numeric week count only (e.g. `4`). Zero when no qualifying streak. Distinct from **Profile consistency line** (current week vs trailing average).


_Avoid_: Day streak, GitHub streak, streak badge on calendar




### Recent workouts (profile)


Horizontal browse feed on the profile page. Read-only preview cards for backed-up **Workouts** (≤5 exercises each), newest first, cursor-paginated with load-more. Card header shows title, date, duration, and **Session goal** badge when classifiable. **See more exercises** links to logged workout detail when needed. Shown when the user has at least one backed-up **Workout**, any **Workout source**. Sits below **Program overview**, profile statistics, and blind spot on the single profile scroll. White card on muted page background per profile Hevy layout.


_Avoid_: Workout feed (ambiguous with social feed), workout history list (too generic)




### Session goal


Inferred training intent for one backed-up **Workout**, **Strength**, **Hypertrophy**, **Endurance**, or **Mixed**, from working-set rep distribution (excludes warmups; includes normal, dropset, and failure sets with non-null reps). Rep zones: Strength 1-5, Hypertrophy 6-12, Endurance 13+. Label is the zone with ≥50% of total working-set reps, otherwise **Mixed**. No badge when there are zero qualifying working sets. Computed client-side from logged sets. Shown as a pill on **Recent workouts** preview cards and **Logged workout detail** metadata. Distinct from blind spot analysis (per-exercise performance) and from profile statistics (weekly aggregates).


_Avoid_: Session type (ambiguous with builder day), workout tag (too generic)




## Legal & privacy

### Account registration


Creation of a Supabase auth identity when a user completes sign-up, before email confirmation for email/password, or on first OAuth provider link for third-party sign-in. Distinct from email-confirmed account and from first authenticated session.


_Avoid_: Sign-up (ambiguous with legal acceptance step), verified user, new user (ops informal)




### Sign-in return


Where the user lands after a successful sign-in (email/password or OAuth). Default is the page they left to sign in (path + query). From the program builder, return includes `resume=true` so **Builder draft** rehydrates. This is not New Chat and does not apply **Empty program template**, even if `empty` is still in the URL; **Sign-in migration** still runs. No current product CTA overrides to a different destination than that page. When no return is known (direct `/auth/login`, missing param), or the candidate is not a safe in-app page path (external URL, protocol-relative, or an auth route), fall back to `/`. Logout should carry the page the user left so re-sign-in can return there. Sign-up ↔ login links preserve an existing return. Applies to sign-in only, not email sign-up success or confirmation. Distinct from **Sign-in migration**.


_Avoid_: next param (implementation), redirect URL, post-auth destination (too broad, includes sign-up), bare `/build-program?resume=true` as the only builder return (drops chat/search context), treating `/` as the default when a previous page exists, using the browser referrer as the return source, applying **Empty program template** on a builder return




### Legal acceptance


Required confirmation that the user has read and agrees to the current **Terms of Use** and **Privacy Policy** versions. All authenticated users must accept when their stored versions are behind the published versions. Email **sign-up** collects required acceptance and writes `user_consents` at registration. The **Legal acceptance dialog** is the safety net for OAuth first-timers, legacy users without a row, and future version bumps. Enforced by an unclosable client dialog over the app until accepted, not by API route locks in v1. No row or stale version = blocked. Prior browsewrap acceptance does not satisfy the gate.


_Avoid_: Terms checkbox (implementation), browsewrap acceptance (deprecated pattern), API consent middleware (v1 out of scope)




### Policy version


Published revision of Terms of Use or Privacy Policy, stored in Supabase (`policy_versions`). Each row is one release of one document type. The app fetches the current version per type. No hardcoded version constants in code. Bumping either version forces **Legal acceptance** for users whose `user_consents` FKs point at older rows.


_Avoid_: Last updated date (display-only), legal_version (bundled single ID)




### Policy version registry


Supabase table holding metadata for each published Terms and Privacy revision (document type, version label, effective date). `user_consents` FKs reference the specific `policy_versions` rows the user accepted. **Current version** = latest row per document type where `effective_at <= now()`. Legal prose lives on static app routes (`/terms-of-use`, `/privacy`). The registry is for gating and audit only.


_Avoid_: CURRENT_TERMS_VERSION constants, version strings in application code, storing full legal text in Postgres (v1)




### Data deletion request


User-initiated request to erase all personal data Proxima holds, without necessarily closing the account. Distinct from **Account deletion** (which also removes the auth identity). v1: policy + email to Proxima support (`jack@proximafitness.com`). No in-app request flow or ticket table.


_Avoid_: GDPR request (jurisdiction-specific label), forget me (informal), self-serve partial wipe (v1 out of scope)




### Account deletion


Permanent removal of the user's auth identity and all associated personal data in Proxima. Available from account settings. Policy states this erases workout history backup, programs, profile, and integrations.


_Avoid_: Deactivate (ambiguous, may imply recoverable), unsubscribe (email-only)




### Platform improvement consent


Optional opt-in allowing Proxima to use the user's workout history backup, programs, builder usage, coaching chats, and **service analytics** (PostHog, Google Analytics) to improve the product and services, aggregated or de-identified where feasible. PostHog and Google Analytics are disclosed together in Privacy Policy and controlled by this single toggle (not a separate analytics consent). Not used for marketing, third-party sale, or ad targeting. v1: store preference and disclose in policy only. **Do not** gate PostHog/GA capture or other pipelines on the flag yet (deferred follow-up). Revocable on **Settings**.


_Avoid_: Analytics consent (separate toggle), research opt-in (subset only), anonymous-only aggregates (v1 scope is broader), operational analytics carve-out (PostHog is in-scope)




### Legal acceptance dialog


Unclosable modal shown over the authenticated app when **Legal acceptance** is required. No dismiss, backdrop click, or Escape. Contains: policy summary, required agreement checkbox with links to Terms and Privacy (open in new tab), Accept button, and footer actions Log out and Delete account.


_Avoid_: Browsewrap banner, dismissible update toast




### Marketing consent


Optional opt-in to receive promotional emails and offers from Proxima. Not required for account or product use. Default off until explicitly opted in. Collected at sign-up and editable on the dedicated **Settings** page. Not re-prompted on every sign-in.


_Avoid_: Newsletter signup (too narrow), notifications (in-app vs email)




### Edit profile


Dedicated account page for identity (name, username, bio, photo) and for inspecting/editing **Agentic memory**. Identity section first, then Agentic-memory subsections: **Constraint profile**, **Training profile**, and **Body measurements** (read-only from **Body measurements backup**). Distinct from the profile page (training stats, Hevy programs, recent workouts) and from **Settings**. Replaces the old profile-page dialog. Separate Saves for identity, Constraint profile (**Save constraints**), and Training profile. Body measurements are sync-backed only (no draft Save). Unsaved identity **or** Constraint profile **or** Training profile drafts block leave with a warn, stay or discard.


_Avoid_: Edit profile dialog, profile preferences card, silent discard of unsaved edits, Constraint-profile-first layout that hides Training profile, tabs that hide memory, constraint-only leave warn, single shared Save, localStorage draft, autosave per chip, treating body-measurement history as a Constraint Save, editable body measurements in v1




### Agentic memory peek


Read-only condensed **Agentic memory** summary near the build-program chat input, separate from token-usage Context. Signed-in users only (hidden when anonymous). Sections: **Constraint profile**, **Training profile**, and latest **Body measurement** (when backup has one). Each section sits in its own collapsed dropdown. The first section with content (else Constraint profile) is open by default. Shows non-empty structured fields only. Truncates long values. Omits Constraint profile **raw statements** (Edit profile only). When all sections empty: still show the control with empty copy and a link to **Edit profile**. Reflects mid-chat Constraint profile and Training profile updates in the same session. Link to **Edit profile** for changes. No editing in the builder.


_Avoid_: Constraint profile peek (old name, too narrow), Context hover (token usage), inline memory editor, memories panel, full 1:1 field mirror in builder, hide when empty, stale-until-reopen only, anon session-only peek, all sections expanded at once




### Settings


Dedicated account page reachable from the sidebar account menu. Hosts **Proxima API key** management plus revocable **Platform improvement consent** and **Marketing consent** toggles. Distinct from **Edit profile** and from the **Legal acceptance dialog** (required policy gate).


_Avoid_: Privacy settings (old name, too narrow), Profile preferences card




### User consents


Single per-user record in Supabase (`user_consents`) holding **Legal acceptance** (FKs to `policy_versions` for Terms and Privacy), **Platform improvement consent**, and **Marketing consent**. One row per user. Created on sign-up or first authenticated session. Audit timestamps: `legal_accepted_at`, `platform_improvement_opt_in_at`, `marketing_opt_in_at` (nullable when opted out). No append-only event log in v1.


_Avoid_: user_preferences (ambiguous with app prefs), legal_acceptances (too narrow), consent_events table (v1 out of scope)

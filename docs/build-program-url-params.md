# Build-program URL query parameters reference

## Source of truth

All parameters are read client-side via `useSearchParams()`:

- [`BuildProgram.tsx`](../src/app/(app)/(with-toolbar)/build-program/BuildProgram.tsx) — `shareId`, `resume`, `empty`, `search`
- [`use-build-program-chat.ts`](../src/app/(app)/(with-toolbar)/build-program/use-build-program-chat.ts) — `search`, `shareId`, `chat`, `new`
- [`StepButton.tsx`](../src/components/program-builder/shared/StepButton.tsx) (via [`BuildProgramToolbarEnd`](../src/components/program-builder/shared/BuildProgramToolbarEnd.tsx)) — `edit` and `hevy` (Sync only when both are `true`)
- [`BuildProgramModeMenu.tsx`](../src/components/program-builder/shared/BuildProgramModeMenu.tsx) — `hevy` (dropdown only when `true`); `edit` when switching New vs Edit inside that session

Shared-program loading uses the same “valid `shareId`” rule as `isBuildProgramShareIdParam` in [`BuildProgram.tsx`](../src/app/(app)/(with-toolbar)/build-program/BuildProgram.tsx) (non-empty, parses to a finite number &gt; 0). [`use-build-program-chat.ts`](../src/app/(app)/(with-toolbar)/build-program/use-build-program-chat.ts) mirrors that logic for the initial-send guard. The legacy `shared` query key is not read; old URLs that still include `shared=true` behave correctly as long as `shareId` is present.

No additional query keys are consumed by the build-program `page.tsx` or `layout.tsx`.

---

### `hevy`

- **What it does:** When `hevy=true`, the build-program session is allowed to offer **Hevy sync-to-existing** UI: the breadcrumb shows a **New / Edit** mode menu ([`BuildProgramModeMenu.tsx`](../src/components/program-builder/shared/BuildProgramModeMenu.tsx)), and the toolbar can show **Sync** when `edit=true` as well ([`StepButton.tsx`](../src/components/program-builder/shared/StepButton.tsx)). Typical entry: **Edit** on a program in the profile Hevy grid ([`HevyProgramsGrid.tsx`](../src/components/program-builder/hevy/HevyProgramsGrid.tsx)) navigates with `resume=true&edit=true&hevy=true`.
- **Edge cases:** Without `hevy=true`, the mode menu is still a dropdown but only offers **New** (no Edit row). **`edit=true` alone does not enable Sync**; both `edit=true` and `hevy=true` are required.

### `edit`

- **What it does:** Together with `hevy=true`, selects **Edit (sync)** vs **New (export)** in the breadcrumb menu and switches the primary toolbar action to **Sync** ([`StepButton.tsx`](../src/components/program-builder/shared/StepButton.tsx)). Sync opens a confirmation dialog; confirming will call the Hevy program **update** (PUT) flow once it is wired to the API. The menu sets or removes `edit=true` via `router.replace`, preserving other query parameters (`resume`, `hevy`, `shareId`, `chat`, `search`, etc.).
- **Edge cases:** Other values (e.g. `edit=false`) are not treated as edit mode; only the string `true` counts. Without **`both`** `edit=true` and `hevy=true`, behavior matches a normal build (**Export**). A stray `edit=true` in the URL without `hevy=true` has no effect on Sync or the mode menu until the user navigates with both flags (e.g. from [`HevyProgramsGrid.tsx`](../src/components/program-builder/hevy/HevyProgramsGrid.tsx)).

### `resume`

- **What it does:** When `resume=true`, loads the in-progress program from `localStorage` key `hevy-program-in-progress` and parses it into editor state. Sets `resumeLoadAttemptedRef`.
- **Edge cases:** If that key is missing or invalid JSON, the program stays empty after the effect’s initial `setHevyProgram([])`. Debounced persistence skips clearing `hevy-program-in-progress` when `resume=true` and the program is still empty (see [`BuildProgram.tsx`](../src/app/(app)/(with-toolbar)/build-program/BuildProgram.tsx) — `localStorage` debounce around `resume === "true"`). Combining with `empty=true` is unsafe: the same effect runs `resume` then **`empty` overwrites** with the empty template.

### `shareId`

- **What it does:** When present and valid (see `isBuildProgramShareIdParam`), [`BuildProgram.tsx`](../src/app/(app)/(with-toolbar)/build-program/BuildProgram.tsx) calls `getSharedProgram(Number(shareId))` and, on success, replaces the editor program. Sets `sharedProgramLoadAttemptedRef` when the fetch finishes (success or not). Also used in sidebar links with `chat` to reopen a program tied to a saved chat ([`AppSidebar.tsx`](../src/components/AppSidebar.tsx) — recent chat links).
- **Edge cases:** Invalid values (empty, non-numeric, zero, or negative) do not trigger a fetch. Async fetch can **race** with other program sources (`resume`, `empty`) if multiple flags are set. The first-message auto-send in `useBuildProgramChat` **defers** until the shared load is no longer blocked when `shareId` is valid, `hevyProgram` is still empty, and `sharedProgramLoadAttemptedRef` is not yet set (see [`use-build-program-chat.ts`](../src/app/(app)/(with-toolbar)/build-program/use-build-program-chat.ts)).

### `empty`

- **What it does:** When `empty=true`, seeds the editor with `emptyHevyProgram` (ordered). Also flows into `programRequest.request` via [`useProgramRequestState`](../src/app/(app)/(with-toolbar)/build-program/use-program-request-state.ts) so the agent request payload includes the `empty` flag.
- **Edge cases:** Conflicts with `resume=true` in the same navigation (empty wins synchronously after resume in the effect order). Typical entry: `/build-program?empty=true` (e.g. [`PromptTemplate.tsx`](../src/components/program-builder/shared/PromptTemplate.tsx), [`MyProgramsVault.tsx`](../src/components/programs/MyProgramsVault.tsx)).

### `search`

- **What it does:** Treated as the initial prompt text for filters/`programRequest` and, when there is no `chat` id, triggers a **single** auto-sent first user message (with optional inferred filters). Persisted debounce also prefers `search` for the stored “prompt” when present.
- **Edge cases:** If length exceeds **1800** characters from the landing prompt ([`PromptTemplate.tsx`](../src/components/program-builder/shared/PromptTemplate.tsx)), the URL uses `search=__long_prompt__` (`LONG_PROMPT_PLACEHOLDER`) and the real text is read from `sessionStorage` (`PENDING_INITIAL_PROMPT_KEY`), then removed. Attachments may be read from `sessionStorage` (`PENDING_ATTACHMENTS_KEY`) for that send. If `chat` is set, this auto-send path is **skipped** entirely.

### `chat`

- **What it does:** Chat history id; [`useChatHistory`](../src/api/hooks.ts) loads messages and hydrates the UI when data arrives.
- **Edge cases:** Disables the initial `search` auto-send (`if (chatId) return` at the start of that effect). Often paired with `shareId` from the sidebar for a full “resume conversation + program” experience.

### `new`

- **What it does:** When `new=true`, clears chat messages and **`router.replace("/build-program")`** strips the query string ([`use-build-program-chat.ts`](../src/app/(app)/(with-toolbar)/build-program/use-build-program-chat.ts)).
- **Edge cases:** User loses other params (`search`, `chat`, etc.) in one step; intended for “fresh chat” from [`AppSidebar`](../src/components/AppSidebar.tsx) (`/build-program?new=true`).

---

## Diagram

```mermaid
flowchart LR
  subgraph params [Query params]
    resume
    shareId
    empty
    search
    chat
    new
    edit
    hevy
  end
  subgraph effects [Main effects]
    program[Hevy program state]
    chatState[Messages / history]
    toolbar[Export vs Sync UI]
  end
  resume --> program
  shareId --> program
  empty --> program
  search --> program
  chat --> chatState
  new --> chatState
  edit --> toolbar
  hevy --> toolbar
```

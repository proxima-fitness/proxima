# Plan 005: Jail skill sandbox paths and remove host bash

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` - unless a reviewer dispatched you and told they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/skills/sandbox.ts src/app/api/chat/tools/tools.ts src/app/api/chat/route.ts @types/global.d.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED - skills must keep loading via `readFile` / `readdir` under `.agents/skills`
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7e07cdf`, 2026-07-17

## Why this matters

The chat “sandbox” is not a sandbox. `createSandbox({ workingDirectory: process.cwd() })` uses host `fs` and `child_process.exec` with no path jail and no command allowlist. The agent always has `bash` in `CORE_TOOLS` (`route.ts`), so a tool call can run arbitrary shell on the Next.js server and read files outside the skills tree (`path.resolve` ignores the root when given an absolute path). Skills only need to discover and read markdown under `.agents/skills` - they do not need shell.

## Current state

`src/app/api/chat/skills/sandbox.ts` (full file today):

```ts
import { promises as fs } from 'node:fs';
import { exec as execCb } from 'node:child_process';
import { resolve } from 'node:path';

export function createSandbox({ workingDirectory }: { workingDirectory: string }): ISandbox {
    function resolvePath(p: string): string {
        return resolve(workingDirectory, p);
    }
    return {
        readFile(path, encoding) { return fs.readFile(resolvePath(path), encoding); },
        async readdir(path, opts) { /* resolvePath + fs.readdir */ },
        exec(command) {
            return new Promise((resolve, reject) => {
                execCb(command, { cwd: workingDirectory }, (error, stdout, stderr) => {
                    if (error) { reject(error); return; }
                    resolve({ stdout, stderr });
                });
            });
        },
    };
}
```

`@types/global.d.ts` (~398-405): `ISandbox` has `readFile`, `readdir`, `exec`.

`src/app/api/chat/route.ts` (~164, ~180): `createSandbox({ workingDirectory: process.cwd() })`; `CORE_TOOLS = ['loadSkill', 'readFile', 'bash']`.

`src/app/api/chat/tools/tools.ts` (~236-242): `bashTool` calls `sandbox.exec(command)`; included in `baseTools` as `bash`.

Skill frontmatter (e.g. `.agents/skills/build-program/SKILL.md`) lists domain tools only; body text tells the model to use `readFile` for resources under `.agents/skills/...`. `bash` is not required by skill workflows.

## Chosen remediation (do not invent a container runtime)

1. **Path jail** in `sandbox.ts`: resolve paths so the final absolute path must stay under `workingDirectory` (reject absolute escapes and `..` traversal). Use `path.resolve` + `path.relative` (or equivalent) and throw a clear error if outside.
2. **Disable host exec**: `exec` must not call `child_process`. Prefer removing `bash` tool + dropping `exec` from `ISandbox`, OR keep `exec` as a stub that rejects with a fixed error. Prefer **remove bash tool + remove/stub exec** so there is no agent entrypoint.
3. **CORE_TOOLS**: change to `['loadSkill', 'readFile']` only - no `bash`.
4. **workingDirectory**: keep `process.cwd()` for skill discovery **or** pass a tighter root if easy (e.g. resolve to repo `.agents` only) - optional; path jail is mandatory either way.

Do **not** write exploit commands, PoCs, or sample payloads in code, comments, or tests. Tests should use relative paths and assert rejection for `..` / absolute paths without demonstrating a full attack chain.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 7e07cdf..HEAD -- src/app/api/chat/skills/sandbox.ts src/app/api/chat/tools/tools.ts src/app/api/chat/route.ts @types/global.d.ts` | empty or WIP |
| Sandbox tests | `npx vitest run src/app/api/chat/skills/__tests__/sandbox.test.ts` | all pass |
| Tools smoke | `npx vitest run src/app/api/chat/__tests__/tools.test.ts` | all pass (bash gone from API) |
| Lint | `npx eslint` on touched files | exit 0 |

## Scope

**In scope**:

- `src/app/api/chat/skills/sandbox.ts`
- `src/app/api/chat/skills/__tests__/sandbox.test.ts` (create)
- `src/app/api/chat/tools/tools.ts` - remove `bashTool` and `bash` from returned tools
- `src/app/api/chat/route.ts` - drop `bash` from `CORE_TOOLS`
- `@types/global.d.ts` - update `ISandbox` if `exec` removed

**Out of scope**:

- Real container/WASM sandbox products
- Changing skill markdown content (unless a reference to `bash` tool must be removed - grep first; only edit if an instruction tells the agent to run shell)
- Constraint merge / mutateProgram plans
- Deploy/infra firewall rules

## Git workflow

- Commit style: `fix(chat): jail skill sandbox paths and remove bash tool`
- Do NOT push unless instructed

## Steps

### Step 1: Drift check

Confirm unrestricted `exec` + `resolvePath` without jail; `bash` in CORE_TOOLS and baseTools.

**Verify**: excerpts match.

### Step 2: Path-jail `sandbox.ts`

Implement `resolvePath` (name as you like) that:

1. Resolves `workingDirectory` to an absolute normalized root.
2. Resolves the user path against that root.
3. Ensures the result is equal to root or a subdirectory (on Windows, use a case-normalization approach consistent with Node; `relative` starting with `..` or absolute ⇒ reject).
4. `readFile` / `readdir` use the jailed path; on reject, throw `Error` with a short safe message (e.g. `Path escapes sandbox root`).

Remove `child_process` import. If `ISandbox.exec` remains, implement as `async () => { throw new Error('exec is disabled'); }` - but prefer removing `exec` from the interface and all call sites.

**Verify**: no `child_process` import in `sandbox.ts`.

### Step 3: Remove agent `bash` tool

In `tools.ts`: delete `bashTool` definition; remove `bash: bashTool` from `baseTools`.

In `route.ts`: `CORE_TOOLS = ['loadSkill', 'readFile']`.

Update `@types/global.d.ts` `ISandbox` to match (drop `exec` if removed).

Grep repo for `sandbox.exec` / `bashTool` / `tools.bash` / `'bash'` in chat skill tooling - fix compile breaks only within scope.

**Verify**: `rg -n "bashTool|sandbox\\.exec|CORE_TOOLS" src/app/api/chat` shows no bash tool / no exec usage (CORE_TOOLS without bash).

### Step 4: Tests

Create `src/app/api/chat/skills/__tests__/sandbox.test.ts`:

1. Use a temp directory as `workingDirectory` (Node `fs.mkdtemp` / vitest tmp) with a nested file `ok.txt`.
2. `readFile('ok.txt')` or relative nested path succeeds.
3. Path with `..` segments that would leave the root → rejects.
4. Absolute path outside the root → rejects.
5. If `exec` still on interface → calling it rejects; if removed → no test for exec.

Do not assert on secrets, env files, or OS-specific sensitive paths in expectations.

**Verify**: sandbox tests pass; `tools.test.ts` still passes.

### Step 5: Manual skill sanity (read-only check)

From repo root, mentally / via a tiny test: `createSandbox({ workingDirectory: process.cwd() })` can `readdir('.agents/skills')` and `readFile` one known `SKILL.md` - optionally encode as a test with cwd = repo root if stable in CI.

**Verify**: discoverSkills path still works (existing chat flow); if you have a unit test for discoverSkills, run it.

### Step 6: Lint + index

**Verify**: eslint exit 0; README 005 = DONE.

## Test plan

| Case | Assert |
|------|--------|
| Relative file inside root | read succeeds |
| `..` escape | throws |
| Absolute outside root | throws |
| tools factory | no `bash` key on returned object (add assertion in `tools.test.ts` if easy) |

## Done criteria

- [ ] No `child_process` in sandbox implementation
- [ ] Path jail rejects escapes
- [ ] Agent tools do not include `bash`
- [ ] `CORE_TOOLS` has no `bash`
- [ ] Skills can still read files under `.agents/skills` via jailed relative paths
- [ ] Tests added and passing
- [ ] eslint clean; README 005 = DONE
- [ ] No out-of-scope files

## STOP conditions

- A skill or production path **requires** shell execution - STOP and report which skill/command; do not re-enable unrestricted exec
- Path jail breaks `discoverSkills` after two fix attempts - report failing path strings (not a PoC)
- Platform path edge case (Windows drive letters) unclear after two attempts - STOP with details for advisor
- Request to add “safe command allowlist” that still shells out - out of scope; stick to disable exec

## Maintenance notes

- Reviewer: confirm `loadSkill` + `readFile` still in CORE_TOOLS so scoped skills can load resources.
- If a future skill needs compute, use a dedicated allowlisted Node API - never restore raw `exec`.
- Hard Rule reminder for any docs: never paste runnable attack commands into plans/PRs.

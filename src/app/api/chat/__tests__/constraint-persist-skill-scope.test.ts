/**
 * Regression: Constraint profile writes must survive skill tool allowlists.
 *
 * Root cause (2026-07): loadSkill set build-program / mutate-program allowedTools
 * without updateConstraintProfile; prepareCall filtered it out → 0 user_constraints rows.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSandbox } from "../skills/sandbox";
import { discoverSkills } from "../skills/index";
import { getTools } from "../tools/tools";
import { initializeConstraintProfile } from "../constraints";
import { ALWAYS_AVAILABLE_CHAT_TOOLS } from "../always-available-tools";

vi.mock("@/api/user-constraints", () => ({
    upsertUserConstraints: vi.fn(async () => {}),
}));

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { upsertUserConstraints } from "@/api/user-constraints";

const upsertUserConstraintsMock = vi.mocked(upsertUserConstraints);

type TToolExecuteHarness<TInput, TOpts = undefined> = TOpts extends undefined
    ? { execute: (input: TInput) => Promise<unknown> }
    : { execute: (input: TInput, opts: TOpts) => Promise<unknown> };

function asTestTool<TInput, TOpts = undefined>(tool: unknown): TToolExecuteHarness<TInput, TOpts> {
    return tool as TToolExecuteHarness<TInput, TOpts>;
}

function asToolRecord(tools: ReturnType<typeof getTools>): Record<string, unknown> {
    return tools as Record<string, unknown>;
}

/** Mirrors route.ts prepareCall tool filter after loadSkill sets allowlist. */
function filterToolsForSkillScope(
    tools: Record<string, unknown>,
    allowedTools: string[] | null | undefined,
): string[] {
    if (!allowedTools?.length) return Object.keys(tools);
    const allowed = new Set([...allowedTools, ...ALWAYS_AVAILABLE_CHAT_TOOLS]);
    return Object.keys(tools).filter((name) => allowed.has(name));
}

describe("constraint persist skill scope", () => {
    beforeEach(() => {
        upsertUserConstraintsMock.mockClear();
    });

    it("discoverSkills: build-program and mutate-program exist with allowlists", async () => {
        const sandbox = createSandbox({ workingDirectory: process.cwd() });
        const skills = await discoverSkills(sandbox, [".agents/skills"]);
        const build = skills.find((s) => s.name === "build-program");
        const mutate = skills.find((s) => s.name === "mutate-program");

        expect(build?.allowedTools?.length).toBeGreaterThan(0);
        expect(mutate?.allowedTools?.length).toBeGreaterThan(0);
    });

    it("after build-program skill scope, updateConstraintProfile still available (CORE)", async () => {
        const sandbox = createSandbox({ workingDirectory: process.cwd() });
        const skills = await discoverSkills(sandbox, [".agents/skills"]);
        const build = skills.find((s) => s.name === "build-program");
        expect(build).toBeDefined();
        // Skill YAML itself may omit memory tools; CORE must still expose them.
        expect(build!.allowedTools).not.toContain("updateConstraintProfile");

        const tools = getTools({
            userId: "user-1",
            workoutHistoryDb: {} as TWorkoutHistoryDb,
            constraintProfile: initializeConstraintProfile({}),
        });

        const visible = filterToolsForSkillScope(asToolRecord(tools), build!.allowedTools);

        expect(visible).toContain("updateConstraintProfile");
    });

    it("after mutate-program skill scope, updateConstraintProfile still available (CORE)", async () => {
        const sandbox = createSandbox({ workingDirectory: process.cwd() });
        const skills = await discoverSkills(sandbox, [".agents/skills"]);
        const mutate = skills.find((s) => s.name === "mutate-program");
        expect(mutate).toBeDefined();
        expect(mutate!.allowedTools).not.toContain("updateConstraintProfile");

        const tools = getTools({
            userId: "user-1",
            workoutHistoryDb: {} as TWorkoutHistoryDb,
            constraintProfile: initializeConstraintProfile({}),
        });

        const visible = filterToolsForSkillScope(asToolRecord(tools), mutate!.allowedTools);

        expect(visible).toContain("updateConstraintProfile");
    });

    it("loadSkill mutates activeToolScope to skill allowlist (omits memory tool)", async () => {
        const sandbox = createSandbox({ workingDirectory: process.cwd() });
        const skills = await discoverSkills(sandbox, [".agents/skills"]);
        const build = skills.find((s) => s.name === "build-program");
        expect(build).toBeDefined();

        const tools = getTools({});
        const activeToolScope: { allowedTools: string[] | null } = { allowedTools: null };

        type TLoadSkillOpts = {
            toolCallId: string;
            messages: [];
            context: {
                sandbox: ReturnType<typeof createSandbox>;
                skills: typeof skills;
                activeToolScope: typeof activeToolScope;
            };
        };

        const loadSkill = asTestTool<{ name: string }, TLoadSkillOpts>(tools.loadSkill);

        await loadSkill.execute(
            { name: "build-program" },
            {
                toolCallId: "test-load-skill",
                messages: [],
                context: { sandbox, skills, activeToolScope },
            },
        );

        expect(activeToolScope.allowedTools).toEqual(build!.allowedTools);
        expect(activeToolScope.allowedTools).not.toContain("updateConstraintProfile");
    });

    it("updateConstraintProfile upserts when logged-in + db provided", async () => {
        const profile = initializeConstraintProfile({});
        const db = {} as TWorkoutHistoryDb;
        const tools = getTools({
            userId: "user-1",
            workoutHistoryDb: db,
            constraintProfile: profile,
        });

        const update = asTestTool<{
            addInjuries?: string[];
            rawStatement?: string;
        }>(tools.updateConstraintProfile);

        await update.execute({
            addInjuries: ["left shoulder"],
            rawStatement: "my left shoulder hurts",
        });

        expect(upsertUserConstraintsMock).toHaveBeenCalledWith(
            db,
            "user-1",
            expect.objectContaining({
                injuries: expect.arrayContaining(["left shoulder"]),
            }),
            "my left shoulder hurts",
        );
    });

    it("updateConstraintProfile skips upsert when anonymous (no userId)", async () => {
        const tools = getTools({
            constraintProfile: initializeConstraintProfile({}),
        });

        const update = asTestTool<{ addInjuries?: string[] }>(tools.updateConstraintProfile);

        await update.execute({ addInjuries: ["knee"] });
        expect(upsertUserConstraintsMock).not.toHaveBeenCalled();
    });
});

/**
 * @module chat/tools
 *
 * Defines all Vercel AI SDK tools available to the "Andy" ToolLoopAgent.
 * Each tool is a `tool()` descriptor with a Zod input schema, an `execute`
 * handler, and a `toModelOutput` transformer that minimises token usage by
 * returning only a summary to the LLM while sending full data to the client.
 *
 * Tools provided:
 *  - getExerciseList - fetches and filters available Hevy exercises
 *  - getMoreInfoQuestions - opens the pre-build questionnaire UI
 *  - openHevyExportGate - opens the Hevy export gate footer (sign-in / Hevy key prerequisites)
 *  - planProgram - structured multi-week plan (duration, blocks, progression) before buildWeek
 *  - readProgram - on-demand full program snapshot from the request
 *  - buildWeek - constructs a full week of THevyRoutine days in one call (titles resolved from hevy_exercise_templates by ID)
 *  - mutateProgram - applies typed registry operation batches to the program
 *  - rateProgram - scores the current bodybuilding program (heuristic report card)
 *  - getWorkoutHistory - Pro-only backed-up workout history from Supabase (no live Hevy)
 *  - getBodyMeasurements - Pro-only backed-up body measurements from Supabase (no live Hevy)
 *  - fetchHevyShareFolder - read-only **Hevy share fetch** of a pasted hevy.com share link
 *    (shared folder, shared routine, or a public completed workout)
 *  - importHevyShareFolder - confirmed **Hevy share import** that seeds an empty grid with the shared week
 *
 * Depends on: ai, zod, @/components/program-builder/api/hevy, @/assets/constants, @/lib/hevy-share
 * Used by: /api/chat/route.ts (passed to ToolLoopAgent)
 */

import { z } from 'zod';
import { getHevyExercises } from '@/components/program-builder/api/hevy';
import { sampleQuestions } from '@/assets/constants';
import { scoreProgramForBodybuilding } from '@/components/program-builder/utils/score-program';
import {
    applyOperations,
    buildMutateProgramToolDescription,
    mutateProgramInputSchema,
    type TAgentProgramOperation,
} from '@/components/program-builder/mutations';
import {
    resolveExercisePayload,
    resolveSwapTemplateTo,
} from '@/components/program-builder/mutations/resolveExercisePayload';
import type {
    TInsertExercisePayload,
    TSwapExerciseTemplateMinimalTo,
} from '@/components/program-builder/mutations/schemas';
import { isApplyBatchFailure } from '@/components/program-builder/mutations/types';
import { readProgramInputSchema, formatReadProgramForModel, readProgramSnapshot } from './read-program';
import {
    AGENT_WORKOUT_HISTORY_MAX,
    clampWorkoutHistoryLimit,
    formatWorkoutHistoryForModel,
    getWorkoutHistoryInputSchema,
    type TWorkoutHistoryToolOutput,
} from './workout-history';
import {
    AGENT_BODY_MEASUREMENTS_MAX,
    clampBodyMeasurementsLimit,
    formatBodyMeasurementsForModel,
    getBodyMeasurementsInputSchema,
    normalizeMeasuredOnBound,
    type TBodyMeasurementsToolOutput,
} from './body-measurements';
import {
    fetchHevyShareFolderInputSchema,
    formatHevyShareForModel,
    formatHevyShareImportForModel,
    hevyShareErrorOutput,
    hevyShareImportOutput,
    hevyShareImportRefusal,
    hevyShareToolOutput,
    importHevyShareFolderInputSchema,
    type TFetchHevyShareFolderToolOutput,
    type TImportHevyShareFolderToolOutput,
} from './hevy-share';
import { loadHevyShare } from '@/lib/hevy-share';
import {
    ensureWorkoutHistoryFresh,
    getSyncProgress,
    getWorkoutsForUser,
} from '@/api/workout-history-read';
import { softToolErrorResult } from './soft-tool-fail-log';
import {
    getBodyMeasurementsForUser,
} from '@/api/body-measurements-read';
import { readBodyMeasurementsSyncCursor } from '@/api/body-measurements-sync';
import { tool } from 'ai';
import type { TConstraintProfile } from '../constraints';
import { splitConstraintCsv } from '../constraints/initialize';
import { validateAgainstConstraints } from '../constraints/validate';
import { upsertUserConstraints } from '@/api/user-constraints';
import { upsertUserTrainingProfile } from '@/api/user-training-profile';
import {
    canonicalizeConstraintPreferenceValue,
    constraintPreferenceEnumValues,
    type TConstraintPreferenceKey,
} from '@/components/account/constraint-profile-options';

function preferenceEnumField(key: TConstraintPreferenceKey) {
    const values = constraintPreferenceEnumValues(key);
    return z
        .enum(values)
        .optional()
        .describe(`Canonical questionnaire option id. Allowed: ${values.join(', ')}`);
}

/** Exported for tests: preference patch schema for updateConstraintProfile. */
export const constraintPreferencesUpdateSchema = z
    .object({
        splitType: preferenceEnumField('splitType'),
        exerciseVariability: preferenceEnumField('exerciseVariability'),
        progressionSystem: preferenceEnumField('progressionSystem'),
        deloadWeek: preferenceEnumField('deloadWeek'),
        peakWeek: preferenceEnumField('peakWeek'),
        warmupExercises: preferenceEnumField('warmupExercises'),
    })
    .optional()
    .describe('Preference fields to update (only provided keys are changed; values must be catalog option ids)');

/** Request-scoped flag: set after first successful buildWeek so the agent cannot call buildWeek twice in one chat turn. */
export interface IBuildWeekOnceGuard {
    locked: boolean;
}

interface IProps {
    hevyProgram?: THevyRoutine[];
    buildWeekOnceGuard?: IBuildWeekOnceGuard;
    /** When false, getWorkoutHistory is omitted from the tool set (Pro-only). */
    hasActiveSubscription?: boolean;
    userId?: string;
    workoutHistoryDb?: TWorkoutHistoryDb;
    /** Structured constraint profile; when provided, updateConstraintProfile tool is included. Filters getExerciseList. */
    constraintProfile?: TConstraintProfile;
    /** Structured Training profile; when provided, updateTrainingProfile tool mutates/persists it. */
    trainingProfile?: TTrainingProfile;
    /** User's weight display preference (true = lbs). Defaults to true to match UI default. */
    isInLbs?: boolean;
    /** Client IP, for the **Hevy share fetch** throttle when the caller is anonymous. */
    clientIp?: string;
    /**
     * Whether the builder grid currently holds any exercise rows, sent on every turn.
     *
     * `hevyProgram` alone cannot answer this: the client omits the snapshot when the
     * message does not read as program talk, and "yes, load it" does not. **Hevy share
     * import** gates on an empty grid, so it needs the flag rather than the snapshot.
     */
    programHasExercises?: boolean;
}

/** Fallback grid-state read for callers that pass a snapshot but no explicit flag. */
function snapshotHasExercises(hevyProgram?: THevyRoutine[]): boolean {
    return (hevyProgram ?? []).some((routine) => (routine.exercises?.length ?? 0) > 0);
}

function stripFrontmatter(content: string): string {
    const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    return match ? content.slice(match[0].length).trim() : content.trim();
}

const planBlockSchema = z.object({
    name: z.string().min(1).describe('Block label (e.g. Accumulation, Intensification).'),
    weeks: z.array(z.number().int().min(1)).min(1).describe('1-based week indices included in this block.'),
    intent: z.string().describe('Training focus for this block (volume, intensity, taper, etc.).'),
});

/** Per-lift or pattern progression: parallel arrays keyed by metric name, length must match durationWeeks when numeric arrays. */
const weekProgressionEntrySchema = z.record(
    z.string(),
    z.union([z.array(z.number()), z.string()]),
);

/** Exported for tests: same schema as planProgram tool input. */
export const planProgramInputSchema = z
    .object({
        durationWeeks: z.number().int().min(1).max(52).describe('Total program length in weeks.'),
        goal: z.string().min(1).max(500).describe('Primary goal in plain language.'),
        daysPerWeek: z.number().int().min(1).max(7).describe('Training days per week.'),
        blocks: z.array(planBlockSchema).min(1).describe('Mesocycle blocks covering the program.'),
        weekProgression: z
            .record(z.string(), weekProgressionEntrySchema)
            .optional()
            .describe(
                'Optional progression table (e.g. squat/bench/deadlift keys) with parallel numeric arrays per metric; each array length must equal durationWeeks.',
            ),
        notes: z.array(z.string()).optional().describe('Programming rules (e.g. swap variations only at block boundaries).'),
    })
    .superRefine((data, ctx) => {
        const w = data.durationWeeks;
        for (const [lift, attrs] of Object.entries(data.weekProgression ?? {})) {
            for (const [metric, val] of Object.entries(attrs)) {
                if (Array.isArray(val) && val.length !== w) {
                    ctx.addIssue({
                        code: 'custom',
                        message: `weekProgression.${lift}.${metric} must have length ${w} (durationWeeks)`,
                        path: ['weekProgression', lift, metric],
                    });
                }
            }
        }
    });

/** Expand add/remove args that may contain comma-joined CSV blobs into tokens. */
function flattenConstraintTokens(values?: string[]): string[] {
    return (values ?? []).flatMap((v) => splitConstraintCsv(v));
}

/** Add items to an array, skipping duplicates (case-insensitive). */
function patchStringArray(arr: string[], add?: string[], remove?: string[]): string[] {
    const addFlat = flattenConstraintTokens(add);
    const removeFlat = flattenConstraintTokens(remove);
    const removeSet = new Set(removeFlat.map(s => s.toLowerCase()));
    const existing = new Set(arr.map(s => s.toLowerCase()));
    return [
        ...arr.filter(s => !removeSet.has(s.toLowerCase())),
        ...addFlat.filter(s => !existing.has(s.toLowerCase()) && !removeSet.has(s.toLowerCase())),
    ];
}

/** Exported for tests: getExerciseList accepts userRequest only; filters come from Constraint profile. */
export const getExerciseListInputSchema = z.object({
    userRequest: z.string().describe('The user\'s workout request or description'),
});

/**
 * Factory that creates the complete tool set for the chat agent. Captures
 * the Constraint profile and current program in a closure so each tool can
 * reference them without extra round-trips.
 *
 * @param props.hevyProgram - The user's current Hevy routines (request-body snapshot for readProgram).
 * @param props.constraintProfile - In-request Constraint profile; drives getExerciseList filters.
 * @returns An object mapping tool names to Vercel AI SDK tool descriptors.
 */
export function getTools({
    hevyProgram,
    buildWeekOnceGuard,
    hasActiveSubscription = false,
    userId,
    workoutHistoryDb,
    constraintProfile,
    trainingProfile,
    isInLbs = true,
    clientIp,
    programHasExercises,
}: IProps = {}) {

    /** Grid-state gate for **Hevy share import**; an Edit-path chat always trips it. */
    const gridHasExercises = programHasExercises ?? snapshotHasExercises(hevyProgram);

    /** Request-scoped id → canonical title from hevy_exercise_templates (populated by getExerciseList; buildWeek uses it or refetches). */
    const exerciseIdToTitle = new Map<string, string>();

    /** Cached result of getHevyExercises() to avoid redundant Supabase queries within a single request. */
    let cachedHevyExercises: Awaited<ReturnType<typeof getHevyExercises>> | null = null;

    /** When getExerciseList has not run this turn, load all templates so buildWeek can still validate IDs. */
    async function ensureExerciseIdToTitleMap(): Promise<void> {
        if (exerciseIdToTitle.size > 0 && cachedHevyExercises) return;
        const all = await getHevyExercises();
        cachedHevyExercises = all;
        for (const ex of all) {
            if (ex?.id) exerciseIdToTitle.set(ex.id, ex.title);
        }
    }

    async function getCachedHevyExercises() {
        await ensureExerciseIdToTitleMap();
        return cachedHevyExercises!;
    }

    const sandboxContextSchema = z.object({
        sandbox: z.custom<ISandbox>(),
    });

    const loadSkillContextSchema = z.object({
        sandbox: z.custom<ISandbox>(),
        skills: z.array(
            z.object({
                name: z.string(),
                description: z.string(),
                path: z.string(),
                allowedTools: z.array(z.string()).optional(),
            }),
        ),
        activeToolScope: z.object({
            allowedTools: z.array(z.string()).nullable(),
        }),
    });

    /**
     * Title: loadSkillTool
     * Description: Tool to load a skill to get specialized instructions
     * @returns { Tool }
     */
    const loadSkillTool = tool({
        description: 'Load a skill to get specialized instructions',
        inputSchema: z.object({
            name: z.string().describe('The skill name to load'),
        }),
        contextSchema: loadSkillContextSchema,
        execute: async ({ name }, { context }) => {
            const { sandbox, skills, activeToolScope } = context;

            const skill = skills.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (!skill) {
                return { error: `Skill '${name}' not found` };
            }

            if (skill.allowedTools?.length) {
                activeToolScope.allowedTools = skill.allowedTools;
            }

            const skillFile = `${skill.path}/SKILL.md`;
            const content = await sandbox.readFile(skillFile, 'utf-8');
            const body = stripFrontmatter(content);

            return {
                skillDirectory: skill.path,
                content: body,
            };
        },
    });

    /**
     * Title: readFileTool
     * Description: Tool to read a file from the filesystem
     * @returns { Tool }
     */
    const readFileTool = tool({
        description: 'Read a file from the filesystem',
        inputSchema: z.object({ path: z.string() }),
        contextSchema: sandboxContextSchema,
        execute: async ({ path }, { context }) => {
            return context.sandbox.readFile(path, 'utf-8');
        },
    });

    /**
     * Title: bashTool
     * Description: Tool to execute a bash command
     * @returns { Tool }
     */
    const bashTool = tool({
        description: 'Execute a bash command',
        inputSchema: z.object({ command: z.string() }),
        contextSchema: sandboxContextSchema,
        execute: async ({ command }, { context }) => {
            return context.sandbox.exec(command);
        },
    });

    /**
     * Title: getExerciseListTool
     * Description: Tool that creates first week of workout Program in JSON format.
     * @returns { Tool }
     */
    const getExerciseListTool = tool({

        description: 'Provides access to all available Hevy exercises for building workout programs. Use this tool when users request workout programs. The tool returns a reference list of exercises (ID and title only) - you should then build a complete, well-structured day using exercise IDs, titles, sets, rep_range (for true ranges like 8-12) or reps (for fixed counts like 5 sets x 5 reps), and RPE. For fixed-rep work, set rep_range to null and use reps only. Target 6-7 total exercise rows per training day including warmup(s); see the build-program skill for the session-size default and exceptions. Exclusion filters come from the Active Constraint Profile - do not pass exclude args.',
        inputSchema: getExerciseListInputSchema,

        execute: async ({ userRequest }) => {
            try {
                // Filters only from Constraint profile (route already seeded wire strings via initialize + merge)
                const excludedEquipment = constraintProfile?.excludedEquipment ?? [];
                const excludedAreas = constraintProfile?.excludedAreas ?? [];

                // Fetch all available Hevy exercises
                const exercises = await getCachedHevyExercises();

                // Filter exercises based on profile exclusions (title / primary-muscle heuristics unchanged)
                let filteredExercises = [...exercises];

                if (excludedEquipment.length > 0) {
                    const excludedEq = excludedEquipment.map((e) => e.trim().toLowerCase()).filter(Boolean);
                    filteredExercises = filteredExercises.filter((ex) => {
                        const title = ex.title.toLowerCase();
                        return !excludedEq.some((eq: string) => title.includes(eq));
                    });
                }

                if (excludedAreas.length > 0) {
                    const excludedAreasList = excludedAreas.map((e) => e.trim().toLowerCase()).filter(Boolean);
                    filteredExercises = filteredExercises.filter((ex) => {
                        const primaryMuscle = ex.primary_muscle_group?.toLowerCase() || '';
                        return !excludedAreasList.some((area: string) => primaryMuscle.includes(area));
                    });
                }

                exerciseIdToTitle.clear();
                for (const ex of filteredExercises) {
                    if (ex?.id) exerciseIdToTitle.set(ex.id, ex.title);
                }

                // Return full exercise list for application logic
                // The AI will receive a minimal version via toModelOutput
                return {
                    availableExercises: filteredExercises.map(ex => ({
                        id: ex.id,
                        title: ex.title,
                        normalized_title: ex.normalized_title,
                        primary_muscle_group: ex.primary_muscle_group,
                        equipment: ex.equipment,
                    })),
                    totalExercises: filteredExercises.length,
                    parameters: {
                        userRequest,
                    },
                    note: 'CRITICAL: You must ONLY use exercise_template_id values that exist in the availableExercises array. Do not invent exercises or use IDs that are not in this list.',
                };

            } catch (error) {
                console.error('Error in getExerciseListTool tool:', error);
                return {
                    error: 'Failed to fetch exercises',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },

        toModelOutput: async ({ output }) => {
            // Return minimal data for AI context to reduce token usage
            // Only send IDs and titles instead of full exercise metadata
            if (output.error) {
                return {
                    type: 'text' as const,
                    value: `Error: ${output.message || 'Failed to fetch exercises'}`,
                };
            }

            const exerciseList = output?.availableExercises?.map(ex => `${ex.id}: ${ex.title}`).join('\n') || '';

            return {
                type: 'text' as const,
                value: `Available exercises (${output.totalExercises} total):\n${exerciseList}\n\nCRITICAL: You must ONLY use exercise_template_id values that exist in the list above. Do not invent exercises or use IDs that are not in this list.\n\nSession size reminder: target 6-7 total exercise rows per training day in buildWeek (including the 1-2 warmup rows). A typical day = 1 warmup + 5-6 working exercises. Only go below 6 total if the user explicitly requested a short session, time cap, or deload day.`,
            };
        },
    });

    /**
     * Title: getMoreInfoQuestionsTool
     * Description: Tool to open a questions component to gather additional information from the user before building a workout program.
     * @returns { Tool }
     */
    const getMoreInfoQuestionsTool = tool({
        description: 'Opens a questions component to gather additional information from the user before building a workout program. Use this tool when a user requests to create, build, make, or generate a workout program, training program, or exercise routine. This should be called FIRST before building the program.',
        inputSchema: z.object({
            userRequest: z.string().optional().describe('The user\'s original request for context'),
        }),
        execute: async ({ userRequest }) => {
            try {
                // Return the questions data that will be displayed in the UI
                return {
                    questions: sampleQuestions,
                    userRequest: userRequest || '',
                    message: 'Questions component opened to gather program preferences.',
                };
            } catch (error) {
                console.error('Error in getMoreInfoQuestions tool:', error);
                return {
                    error: 'Failed to load questions',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },

        toModelOutput: async ({ output }) => {
            if (output.error) {
                return {
                    type: 'text' as const,
                    value: `Error: ${output.message || 'Failed to load questions'}`,
                };
            }
            return {
                type: 'text' as const,
                value: 'Questions component has been opened. Please wait for the user to complete the questions before proceeding with program generation.',
            };
        },
    });

    /**
     * Title: openHevyExportGateTool
     * Description: Opens the Hevy export gate footer for missing sign-in / Hevy API key prerequisites.
     * Payload is a UI open signal only - never includes secrets.
     */
    const openHevyExportGateTool = tool({
        description:
            'Opens the Hevy export gate in the chat footer to collect missing prerequisites for pushing a program to Hevy (sign in, then Hevy API key). ' +
            'Call when the user clearly asks to export / upload / push / sync / send the program to Hevy, the program grid is non-empty, and at least one prerequisite is missing (not signed in and/or no Hevy API key on file). ' +
            'Do not call when both prerequisites are already done - guide them in text to toolbar Save then profile Week Export. ' +
            'Do not call when the program grid is empty or the Questionnaire gate (getMoreInfoQuestions) is still active. ' +
            'This tool does not Save or Week Export; it only opens prerequisite UI. Never request or echo API key secrets.',
        inputSchema: z.object({
            userRequest: z.string().optional().describe('The user\'s Hevy-export request for context'),
        }),
        execute: async ({ userRequest }) => {
            return {
                opened: true as const,
                userRequest: userRequest || '',
                message: 'Hevy export gate opened for sign-in / Hevy connection prerequisites.',
            };
        },
        toModelOutput: async () => ({
            type: 'text' as const,
            value:
                'Hevy export gate opened. Tell the user to finish the gate steps in the footer, then use toolbar Save and profile Week Export. ' +
                'Do not claim you uploaded or exported to Hevy. Never ask for or repeat an API key.',
        }),
    });

    /**
     * Title: planProgramTool
     * Description: Records a structured multi-week plan before buildWeek (mesocycles, progression table).
     * @returns { Tool }
     */
    const planProgramTool = tool({
        description:
            'Submit a structured multi-week training plan before calling buildWeek on a **new** program. Use questionnaire answers, program builder context (days/week, length), and your judgment. ' +
            'This does not create routines and does **not** shorten an existing program on the grid - for that use **mutateProgram** **delete_week**. Call once per new program only.',
        inputSchema: planProgramInputSchema,
        execute: async (input) => {
            const plan = input;
            const blockNames = plan.blocks.map((b) => b.name).join(', ');
            const summary = `${plan.durationWeeks} wk · ${plan.daysPerWeek} d/wk · blocks: ${blockNames} · ${plan.goal.slice(0, 80)}${plan.goal.length > 80 ? '…' : ''}`;
            return { plan, summary };
        },
        toModelOutput: async ({ output }) => {
            if (output && typeof output === 'object' && 'error' in output && output.error) {
                const o = output as { message?: string };
                return {
                    type: 'text' as const,
                    value: `Error: ${o.message ?? 'Invalid plan'}`,
                };
            }
            const o = output as { summary?: string };
            return {
                type: 'text' as const,
                value: `Plan recorded: ${o.summary ?? 'OK'}. Proceed with getExerciseList, then call buildWeek exactly once (all days in that call), then apply periodization with mutateProgram; do not call buildWeek again after it succeeds.`,
            };
        },
    });

    /**
     * Title: readProgramTool
     * Description: On-demand read of the program snapshot from request start.
     */
    const readProgramTool = tool({
        description:
            'Returns the full **hevyProgram** snapshot from the **start of this request** (does not refresh after **buildWeek** in the same turn). ' +
            'Includes day notes, exercise notes, exercise reason, sets, and structure. Call when you need the current program - not on every turn. ' +
            'Sorted by folder_id (week, 0-based) then order (day number 1-7). For **mutateProgram**: folderIds: [folder_id], dayOrder: order. Target exercises/sets by 0-based array position (exerciseIndex, setIndex). ' +
            'For **post-buildWeek periodization**, do not use this for targeting; use **buildWeek** output, **planProgram**, and **folderIds** + **dayOrder**.',
        inputSchema: readProgramInputSchema,
        execute: async () => ({
            hevyProgram: readProgramSnapshot(hevyProgram),
        }),
        toModelOutput: async ({ output }) => {
            const o = output as { hevyProgram?: THevyRoutine[] };
            return {
                type: 'text' as const,
                value: formatReadProgramForModel(o.hevyProgram ?? [], isInLbs),
            };
        },
    });

    /**
     * Title: fetchHevyShareFolderTool
     * Description: Read-only **Hevy share fetch** of a public hevy.com share link.
     * Never writes to the grid or to Hevy - loading a share into the builder is a separate confirmed step.
     */
    const fetchHevyShareFolderTool = tool({
        description:
            'Reads a **public Hevy share link** the user pasted - `hevy.com/folder/{id}` (a shared routine folder), `hevy.com/routine/{shortId}` (a single shared routine), or `hevy.com/workout/{id}` (a single completed workout someone logged) - and returns its days, exercises, and sets. ' +
            'A workout link returns what was **actually performed** in that session (real loads, reps and set types) plus when it was logged and by whom - not a prescription. ' +
            'Call when the user pastes such a link and wants it read: questions about the split, a critique, feedback on a session they did, or as context while planning a new program. ' +
            'This is **read-only**: it does not add anything to the program grid, does not sync to the shared folder, and does not connect the user\'s Hevy account. Loading a share into the builder is a separate step that needs the user\'s explicit confirmation. ' +
            'Only accepts hevy.com share links - not Hevy app deep links, not api.hevyapp.com URLs, and not links to any other site. Never guess a link the user did not give you.',
        inputSchema: fetchHevyShareFolderInputSchema,
        execute: async ({ url }): Promise<TFetchHevyShareFolderToolOutput> => {
            try {
                return hevyShareToolOutput(await loadHevyShare(url, { userId, ip: clientIp }));
            } catch (error) {
                // Hevy's share endpoints are undocumented - log the shape so a format change is visible.
                console.error('Error in fetchHevyShareFolder tool:', error);
                return hevyShareErrorOutput(error);
            }
        },
        toModelOutput: async ({ output }) => ({
            type: 'text' as const,
            value: formatHevyShareForModel(output as TFetchHevyShareFolderToolOutput),
        }),
    });

    /**
     * Title: importHevyShareFolderTool
     * Description: Confirmed **Hevy share import** - seeds an empty New-path grid with the shared week.
     *
     * Both gates are checked before Hevy is called: an already-populated grid (which is
     * also how an **Edit path** chat presents) and a missing user confirmation both refuse
     * outright. The client applies the returned seed; this tool never writes to Hevy.
     */
    const importHevyShareFolderTool = tool({
        description:
            'Loads a **public Hevy share link** (`hevy.com/folder/{id}`, `hevy.com/routine/{shortId}`, or `hevy.com/workout/{id}`) onto the program grid as a one-week seed - the shared routines become the days of week 1, exactly as written; a completed workout becomes a single day carrying the loads that were actually lifted. ' +
            'Two hard requirements: the program grid must be **empty**, and the user must have **explicitly agreed** to load the share (pass `confirmed: true` only then). Pasting a link is not agreement - to just read a share, use **fetchHevyShareFolder**. ' +
            'When you are unsure whether they want it loaded, ask in your reply and wait for their answer instead of calling this tool. ' +
            'This does not push or sync anything to Hevy, does not touch the shared folder, does not link the program to that folder, and does not need the user\'s Hevy API key. It loads week 1 only - expanding to more weeks or periodizing is a separate ask. ' +
            'The questionnaire is not required first; it applies when generating or expanding a program, not when loading a share.',
        inputSchema: importHevyShareFolderInputSchema,
        execute: async ({ url, confirmed }): Promise<TImportHevyShareFolderToolOutput> => {
            // Grid state first: when both gates fail, confirming would not help.
            if (gridHasExercises) {
                return hevyShareImportRefusal('grid_not_empty');
            }
            if (!confirmed) {
                return hevyShareImportRefusal('not_confirmed');
            }

            try {
                return hevyShareImportOutput(await loadHevyShare(url, { userId, ip: clientIp }));
            } catch (error) {
                // Hevy's share endpoints are undocumented - log the shape so a format change is visible.
                console.error('Error in importHevyShareFolder tool:', error);
                return hevyShareErrorOutput(error);
            }
        },
        toModelOutput: async ({ output }) => ({
            type: 'text' as const,
            value: formatHevyShareImportForModel(output as TImportHevyShareFolderToolOutput),
        }),
    });

    /**
     * Title: buildWeekTool
     * Description: Tool to build a full week of routines/days for the workout program in a single call.
     * @returns { Tool }
     */
    const buildWeekTool = tool({
        description:
            'Builds an entire week of routines/days for the workout program in a SINGLE tool invocation (all training days in one payload). ' +
            'Call **buildWeek at most once** per user request to generate that week; after it succeeds, use **mutateProgram** for any changes (never a second buildWeek to fix or tweak). ' +
            'Provide all days in order (Day 1, Day 2, …) so the UI can duplicate the first week across the remaining weeks. ' +
            'IMPORTANT: Always provide a valid JSON object with the required fields. ' +
            'For rep-based exercises, **prefer rep_range** (e.g. {start:8, end:12}) over a fixed reps value. Set reps as a fallback alongside rep_range. ' +
            '**Fixed-rep rule:** When the prescription is a single fixed rep count (e.g. 5x5, triples, singles), set `rep_range` to **null** and only use `reps`. ' +
            'NEVER emit a degenerate rep_range where start === end (e.g. {start:5, end:5}); that must be rep_range: null, reps: 5 instead. ' +
            'rep_range supersedes reps in the UI, so a {start:5, end:5} range will display as "5-5" which is wrong. ' +
            'Session size: target **6-7 total rows in `exercises[]` per training day** including warmup row(s). Typical day = 1 warmup + 5-6 working exercises. Only drop below 6 total rows if the user explicitly asked for a short/brief session, time cap, deload day, or peaking day with deliberately low volume.',
        inputSchema: z.object({
            totalDays: z.number().min(1).max(7).describe('Total number of days in the program week (1-7).'),
            routines: z
                .array(
                    z.object({
                        dayNumber: z
                            .number()
                            .min(1)
                            .describe('The day number within the week (1, 2, 3, etc.) - must be unique per routine'),
                        title: z
                            .string()
                            .describe('The routine/day title (e.g., "Push Day", "Upper Body")'),
                        notes: z.string().default('').describe('Notes for the routine (optional)'),
                        exercises: z
                            .array(
                                z.object({
                                    exercise_template_id: z
                                        .string()
                                        .describe(
                                            'The exercise ID from the getExerciseList results - MUST be an exact match',
                                        ),
                                    title: z
                                        .string()
                                        .describe(
                                            'Display title: must match getExerciseList for this ID; server replaces it with the canonical hevy_exercise_templates title.',
                                        ),
                                    notes: z.string().default('').describe('Notes for the exercise (optional)'),
                                    rest_seconds: z
                                        .string()
                                        .default('90')
                                        .describe('Rest time in seconds between sets'),
                                    supersets_id: z
                                        .number()
                                        .nullable()
                                        .default(null)
                                        .describe(
                                            '0-indexed superset group: use the same number for all exercises in one superset (0 = first superset, 1 = second, etc.); null or omit = not in a superset',
                                        ),
                                    reason: z
                                        .string()
                                        .max(500)
                                        .optional()
                                        .describe(
                                            'Short prose (2-4 sentences) explaining why this exercise is here - shown in the UI under "Why this exercise?", not exported to Hevy. ' +
                                                'Cover: what the movement does, where it sits in the day/split, and how it fits this person\'s plan or questionnaire answers. ' +
                                                'Be concrete: name real facts (stated limitation, equipment, sessions/week, goal, experience). Do not use bullet labels. Max 500 characters.',
                                        ),
                                    sets: z
                                        .array(
                                            z.object({
                                                type: z
                                                    .enum(['normal', 'warmup', 'dropset', 'failure'])
                                                    .describe('The type of set'),
                                                reps: z.number().nullable().describe(
                                                    'Fixed rep count. When rep_range is set, provide as fallback (typically the upper bound). When rep_range is null, this is the sole prescription. For fixed-rep work (5x5, singles, doubles, triples), set rep_range to null and use only reps.',
                                                ),
                                                rep_range: z
                                                    .object({
                                                        start: z.number().int().min(1).describe('Lower bound of the rep range (e.g. 8 in 8-12)'),
                                                        end: z.number().int().min(1).describe('Upper bound of the rep range (e.g. 12 in 8-12)'),
                                                    })
                                                    .nullable()
                                                    .describe(
                                                        'Rep range for this set (e.g. {start:8, end:12}). Use for hypertrophy/bodybuilding sets where a range is intended. When provided, reps serves as a fallback only. Set to **null** for fixed-rep prescriptions (5x5, singles, doubles, triples). NEVER use a degenerate range where start === end (e.g. {start:5, end:5}); use null and set reps instead.',
                                                    ),
                                                rpe: z
                                                    .number()
                                                    .min(1)
                                                    .max(10)
                                                    .describe(
                                                        'RPE (Rate of Perceived Exertion) 1-10; required',
                                                    ),
                                                weight_kg: z.number().optional().describe(
                                                    'Weight in kg (storage unit). When the user speaks in lbs or asks about display decimals, convert from their UI unit first (lbs × 0.453592).',
                                                ),
                                            }),
                                        )
                                        .min(1)
                                        .describe('Array of sets for this exercise - at least 1 set required'),
                                }),
                            )
                            .min(1)
                            .describe('Array of exercises for this routine - at least 1 exercise required'),
                    }),
                )
                .min(1)
                .describe(
                    'Array of routine definitions for the week. Provide one entry per training day (length should equal totalDays).',
                ),
        }),

        execute: async ({ totalDays, routines }) => {
            try {
                if (buildWeekOnceGuard?.locked) {
                    return softToolErrorResult('buildWeek', {
                        error: 'buildWeek already completed',
                        message:
                            'Week already built in this turn. Use mutateProgram for all edits (reps, RPE, rest, titles, periodization). Do not call buildWeek again.',
                    });
                }

                const timestamp = new Date().toISOString();

                if (!Array.isArray(routines) || routines.length === 0) {
                    return softToolErrorResult('buildWeek', {
                        error: 'Invalid routines',
                        message: 'At least one routine is required',
                    });
                }

                if (routines.length !== totalDays) {
                    return softToolErrorResult('buildWeek', {
                        error: 'Invalid routines',
                        message: 'The number of routines must match totalDays',
                    });
                }

                await ensureExerciseIdToTitleMap();

                for (const routineInput of routines) {
                    const dayNumber = routineInput.dayNumber;
                    if (!Array.isArray(routineInput.exercises) || routineInput.exercises.length === 0) {
                        return softToolErrorResult('buildWeek', {
                            error: 'Invalid exercises',
                            message: `At least one exercise is required for day ${dayNumber}`,
                        });
                    }
                    for (const exercise of routineInput.exercises) {
                        const templateId = (exercise.exercise_template_id ?? '').trim();
                        if (!templateId) {
                            return softToolErrorResult('buildWeek', {
                                error: 'Invalid exercise_template_id',
                                message: `Missing or empty exercise_template_id for day ${dayNumber}. Use getExerciseList and pass a valid ID.`,
                            });
                        }
                        if (!exerciseIdToTitle.has(templateId)) {
                            return softToolErrorResult('buildWeek', {
                                error: 'Invalid exercise_template_id',
                                message: `exercise_template_id "${templateId}" (day ${dayNumber}) is not in hevy_exercise_templates. Call getExerciseList and use only IDs from that list.`,
                            });
                        }
                    }
                }

                const builtRoutines: THevyRoutine[] = [];
                let totalExercises = 0;
                let totalSets = 0;

                for (const routineInput of routines) {
                    const dayNumber = routineInput.dayNumber;

                    if (!Array.isArray(routineInput.exercises) || routineInput.exercises.length === 0) {
                        return softToolErrorResult('buildWeek', {
                            error: 'Invalid exercises',
                            message: `At least one exercise is required for day ${dayNumber}`,
                        });
                    }

                    const routineExercises = routineInput.exercises.map((exercise, exerciseIndex) => {
                        const templateId = (exercise.exercise_template_id ?? '').trim();
                        const canonicalTitle = exerciseIdToTitle.get(templateId) ?? 'Unknown Exercise';

                        const sets = (exercise.sets || []).map((set, setIndex) => {
                            const rawRange = set.rep_range ?? null;
                            const isDegenerate = rawRange != null && rawRange.start === rawRange.end;
                            return {
                                index: setIndex,
                                type: set.type || 'normal',
                                reps: isDegenerate ? (set.reps ?? rawRange.start) : (set.reps ?? null),
                                weight_kg: set.weight_kg ?? null,
                                rpe: set.rpe ?? null,
                                distance_meters: null,
                                duration_seconds: null,
                                custom_metric: null,
                                rep_range: isDegenerate ? null : rawRange,
                            };
                        });

                        totalSets += sets.length;

                        return {
                            index: exerciseIndex,
                            title: canonicalTitle,
                            notes: exercise.notes || '',
                            rest_seconds: exercise.rest_seconds || '90',
                            exercise_template_id: templateId,
                            supersets_id: exercise.supersets_id ?? null,
                            reason: exercise.reason?.trim() || undefined,
                            sets,
                        };
                    });

                    totalExercises += routineExercises.length;

                    const routine: THevyRoutine = {
                        id: String(dayNumber),
                        title: routineInput.title || `Day ${dayNumber}`,
                        folder_id: 0, // Week 1 = folder_id 0; client duplicates across weeks
                        order: String(dayNumber),
                        notes: routineInput.notes || '',
                        created_at: timestamp,
                        updated_at: timestamp,
                        exercises: routineExercises,
                    };

                    builtRoutines.push(routine);
                }

                // Ensure routines are ordered by day
                builtRoutines.sort((a, b) => Number(a.order) - Number(b.order));

                if (constraintProfile) {
                    const allExercises = await getCachedHevyExercises();
                    const templateMap = new Map(allExercises.map(e => [e.id, e]));
                    const exerciseMeta = builtRoutines.flatMap(r =>
                        r.exercises.map(e => templateMap.get(e.exercise_template_id) ?? { title: e.title }),
                    );
                    const validation = validateAgainstConstraints(constraintProfile, exerciseMeta);
                    if (validation.valid === false) {
                        const lines = validation.violations
                            .map(({ exerciseTitle, reason }) => `- ${exerciseTitle}: ${reason}`)
                            .join('\n');
                        return softToolErrorResult('buildWeek', {
                            error: 'constraint_violation',
                            message: `Fix these exercises and call buildWeek again:\n${lines}`,
                        });
                    }
                }

                if (buildWeekOnceGuard) {
                    buildWeekOnceGuard.locked = true;
                }

                return {
                    routines: builtRoutines,
                    totalDays,
                    routineCount: builtRoutines.length,
                    exerciseCount: totalExercises,
                    setCount: totalSets,
                };
            } catch (error) {
                console.error('Error in buildWeekTool:', error);
                return softToolErrorResult('buildWeek', {
                    error: 'Failed to build week',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        },

        toModelOutput: async ({ output }) => {
            if (output && typeof output === 'object' && 'error' in output && output.error) {
                const message =
                    'message' in output && typeof output.message === 'string'
                        ? output.message
                        : undefined;
                return {
                    type: 'text' as const,
                    value: `Error: ${message || 'Failed to build week'}`,
                };
            }

            const success = output as {
                routines?: THevyRoutine[];
                totalDays?: number;
                exerciseCount?: number;
                setCount?: number;
            };
            const titles = Array.isArray(success.routines)
                ? success.routines.map((r) => r.title).join(', ')
                : '';

            return {
                type: 'text' as const,
                value: `Week complete (${success.totalDays} days): ${titles || 'No routine titles'} (${success.exerciseCount} exercises, ${success.setCount} sets). Do not call buildWeek again; use mutateProgram for any changes.`,
            };
        },
    });

    /**
     * Title: mutateProgramTool
     * Description: Typed registry operation batch with server preflight via applyOperations.
     * @returns { Tool }
     */
    const mutateProgramTool = tool({
        description: buildMutateProgramToolDescription(),
        inputSchema: mutateProgramInputSchema,
        execute: async ({ operations }) => {
            try {
                await ensureExerciseIdToTitleMap();

                const resolvedOperations: TAgentProgramOperation[] = [];
                for (let index = 0; index < operations.length; index++) {
                    const operation = operations[index];
                    if (operation.op === 'insert_exercise' || operation.op === 'edit_exercise') {
                        const resolved = resolveExercisePayload(operation.exercise, exerciseIdToTitle);
                        if (resolved.ok === false) {
                            return softToolErrorResult('mutateProgram', {
                                error: 'Program mutation batch failed',
                                failures: [{ index, op: operation.op, reason: resolved.reason }],
                            });
                        }
                        resolvedOperations.push({ ...operation, exercise: resolved.payload });
                    } else if (operation.op === 'swap_exercise_template') {
                        if (operation.preserve_sets === false) {
                            const resolved = resolveExercisePayload(
                                operation.to as TInsertExercisePayload,
                                exerciseIdToTitle,
                            );
                            if (resolved.ok === false) {
                                return softToolErrorResult('mutateProgram', {
                                    error: 'Program mutation batch failed',
                                    failures: [{ index, op: operation.op, reason: resolved.reason }],
                                });
                            }
                            resolvedOperations.push({ ...operation, to: resolved.payload });
                        } else {
                            const resolved = resolveSwapTemplateTo(
                                operation.to as TSwapExerciseTemplateMinimalTo,
                                exerciseIdToTitle,
                            );
                            if (resolved.ok === false) {
                                return softToolErrorResult('mutateProgram', {
                                    error: 'Program mutation batch failed',
                                    failures: [{ index, op: operation.op, reason: resolved.reason }],
                                });
                            }
                            resolvedOperations.push({ ...operation, to: resolved.payload });
                        }
                    } else {
                        resolvedOperations.push(operation);
                    }
                }

                if (constraintProfile) {
                    const allExercises = await getCachedHevyExercises();
                    const templateMap = new Map(allExercises.map(e => [e.id, e]));
                    const incomingExercises = resolvedOperations
                        .filter(op => op.op === 'insert_exercise' || op.op === 'edit_exercise' || op.op === 'swap_exercise_template')
                        .flatMap(op => {
                            let id: string | undefined;
                            if ('exercise' in op && op.exercise && typeof op.exercise === 'object') {
                                id = (op.exercise as { exercise_template_id?: string }).exercise_template_id;
                            } else if ('to' in op && op.to && typeof op.to === 'object') {
                                id = (op.to as { exercise_template_id?: string }).exercise_template_id;
                            }
                            const tmpl = id ? templateMap.get(id) : undefined;
                            return tmpl ? [tmpl] : [];
                        });
                    const validation = validateAgainstConstraints(constraintProfile, incomingExercises);
                    if (validation.valid === false) {
                        const lines = validation.violations
                            .map(({ exerciseTitle, reason }) => `- ${exerciseTitle}: ${reason}`)
                            .join('\n');
                        return softToolErrorResult('mutateProgram', {
                            error: 'constraint_violation',
                            message: `Mutation rejected - constraint violations:\n${lines}`,
                        });
                    }
                }

                const result = applyOperations(hevyProgram ?? [], resolvedOperations);
                if (isApplyBatchFailure(result)) {
                    return softToolErrorResult('mutateProgram', {
                        error: 'Program mutation batch failed',
                        failures: result.failures,
                    });
                }
                return { operations: resolvedOperations };
            } catch (error) {
                console.error('Error in mutateProgramTool:', error);
                return softToolErrorResult('mutateProgram', {
                    error: 'Failed to validate mutation batch',
                    failures: [
                        {
                            index: 0,
                            op: operations[0]?.op ?? 'unknown',
                            reason: error instanceof Error ? error.message : 'Unknown error',
                        },
                    ],
                });
            }
        },
        toModelOutput: async ({ output }) => {
            if (output && typeof output === 'object' && 'error' in output && output.error) {
                const o = output as {
                    error: string;
                    message?: string;
                    failures?: Array<{ index: number; op: string; reason: string }>;
                };
                if (typeof o.message === 'string' && o.message.length > 0) {
                    return {
                        type: 'text' as const,
                        value: o.message,
                    };
                }
                const failureLines =
                    o.failures?.map((f) => `[${f.index}] ${f.op}: ${f.reason}`).join('; ') ??
                    'Unknown validation error';
                return {
                    type: 'text' as const,
                    value: `Mutation batch rejected: ${failureLines}`,
                };
            }
            const o = output as { operations?: unknown[] };
            return {
                type: 'text' as const,
                value: `Mutation batch validated (${o.operations?.length ?? 0} operations) will be applied on the client.`,
            };
        },
    });

    const getWorkoutHistoryTool = tool({
        description:
            'Returns the user\'s backed-up workout history from their Hevy sync (Supabase backup - not a live Hevy API call). ' +
            'Use when they ask about logged training: past weights, reps, sessions, volume, or questions like "what did I bench last month?". ' +
            `Choose the smallest limit that answers the question (typical 5-15; hard cap ${AGENT_WORKOUT_HISTORY_MAX}). ` +
            'Use `since` for time-bounded questions. Reads only synced backup data.',
        inputSchema: getWorkoutHistoryInputSchema,
        execute: async ({ limit, since, canonicalExerciseIds }): Promise<TWorkoutHistoryToolOutput> => {
            try {
                if (!userId || !workoutHistoryDb) {
                    return {
                        error: 'Workout history unavailable',
                        message: 'Workout history requires an authenticated Pro session.',
                    };
                }

                const { data: apiKey, error: keyError } = await workoutHistoryDb.rpc('read_secret', {
                    secret_name: `hevy_api_key_${userId}`,
                });

                if (keyError || !apiKey) {
                    return {
                        error: 'Hevy not connected',
                        message: 'No Hevy backup found. The user must connect Hevy in profile settings first.',
                    };
                }

                const progress = await getSyncProgress(workoutHistoryDb, userId, { apiKey });

                if (progress.syncError) {
                    return {
                        error: 'Sync error',
                        message: progress.syncError,
                    };
                }

                const syncResult = await ensureWorkoutHistoryFresh(workoutHistoryDb, {
                    userId,
                    apiKey,
                });

                const limitApplied = clampWorkoutHistoryLimit(limit);
                const page = await getWorkoutsForUser(workoutHistoryDb, userId, {
                    limit: limitApplied,
                    since,
                    canonicalExerciseIds,
                });

                return {
                    workouts: page.workouts,
                    totalReturned: page.workouts.length,
                    limitApplied,
                    since,
                    hasMore: page.nextCursor != null,
                    syncPending: !syncResult.done && !syncResult.syncError,
                };
            } catch (error) {
                console.error('Error in getWorkoutHistory tool:', error);
                return {
                    error: 'Failed to fetch workout history',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },
        toModelOutput: async ({ output }) => ({
            type: 'text' as const,
            value: formatWorkoutHistoryForModel(output as TWorkoutHistoryToolOutput),
        }),
    });

    const getBodyMeasurementsTool = tool({
        description:
            'Returns the user\'s backed-up body measurements from their Hevy sync (Supabase backup - not a live Hevy API call). ' +
            'Use when they ask about weight, body fat, girths, or trends over time (e.g. "how has my waist changed?"). ' +
            `Choose the smallest limit that answers the question (typical 5-15; hard cap ${AGENT_BODY_MEASUREMENTS_MAX}). ` +
            'Use `since` / `until` for time-bounded questions. Latest check-in may already be in the system prompt.',
        inputSchema: getBodyMeasurementsInputSchema,
        execute: async ({ limit, since, until }): Promise<TBodyMeasurementsToolOutput> => {
            try {
                if (!userId || !workoutHistoryDb) {
                    return {
                        error: 'Body measurements unavailable',
                        message: 'Body measurement history requires an authenticated Pro session.',
                    };
                }

                const { data: apiKey, error: keyError } = await workoutHistoryDb.rpc('read_secret', {
                    secret_name: `hevy_api_key_${userId}`,
                });

                if (keyError || !apiKey) {
                    return {
                        error: 'Hevy not connected',
                        message: 'No Hevy backup found. The user must connect Hevy in profile settings first.',
                    };
                }

                const syncCursor = await readBodyMeasurementsSyncCursor(workoutHistoryDb, userId);

                if (syncCursor.syncError) {
                    return {
                        error: 'Sync error',
                        message: syncCursor.syncError,
                    };
                }

                const limitApplied = clampBodyMeasurementsLimit(limit);
                const sinceBound = normalizeMeasuredOnBound(since);
                const untilBound = normalizeMeasuredOnBound(until);
                const page = await getBodyMeasurementsForUser(workoutHistoryDb, userId, {
                    limit: limitApplied,
                    since: sinceBound,
                    until: untilBound,
                });

                const syncPending =
                    syncCursor.lastKnownMeasurementCount != null &&
                    syncCursor.lastSyncedPage != null &&
                    syncCursor.lastKnownPageCount != null &&
                    syncCursor.lastSyncedPage < syncCursor.lastKnownPageCount;

                return {
                    measurements: page.measurements,
                    totalReturned: page.measurements.length,
                    limitApplied,
                    since: sinceBound,
                    until: untilBound,
                    hasMore: page.nextCursor != null,
                    syncPending,
                };
            } catch (error) {
                console.error('Error in getBodyMeasurements tool:', error);
                return {
                    error: 'Failed to fetch body measurements',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },
        toModelOutput: async ({ output }) => ({
            type: 'text' as const,
            value: formatBodyMeasurementsForModel(output as TBodyMeasurementsToolOutput),
        }),
    });

    const rateProgramTool = tool({
        description:
            'Heuristic report card (volume, frequency, categories, rep variety, session size). ' +
            'Call only when the user explicitly asks to rate their program (same intent as the "Rate my program" chip). ' +
            'Do not call for "how do I improve", generic review, or critique-use readProgram and reply in chat. ' +
            'Uses the same request-start snapshot as readProgram.',
        inputSchema: z.object({
            reason: z.string().optional().describe('Short note on why the rating was requested'),
        }),
        execute: async () => {
            try {
                const templates = await getCachedHevyExercises();
                const score = scoreProgramForBodybuilding(hevyProgram ?? [], templates);
                return { score };
            } catch (error) {
                console.error('Error in rateProgram tool:', error);
                return {
                    error: 'Failed to rate program',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },
        toModelOutput: async ({ output }) => {
            if (output && typeof output === 'object' && 'error' in output && output.error) {
                const o = output as { message?: string };
                return {
                    type: 'text' as const,
                    value: `Error: ${o.message ?? 'Failed to rate program'}`,
                };
            }
            const o = output as { score?: { headline: string; summary: { passed: number; failed: number; okay: number }; emptyProgram: boolean } };
            const s = o.score;
            if (!s) {
                return { type: 'text' as const, value: 'No score returned.' };
            }
            if (s.emptyProgram) {
                return { type: 'text' as const, value: s.headline };
            }
            return {
                type: 'text' as const,
                value: `${s.headline} Green = on track, yellow = could improve, red = priority fix. Summarize tradeoffs briefly; landmarks are starting points, not rigid rules.`,
            };
        },
    });

    const updateConstraintProfileTool = tool({
        description:
            'Persist and update the active Constraint profile (Agentic memory). ' +
            'Call after questionnaire unlock only when there are non-empty fields to persist; skip entirely when the user skipped and nothing changed - do not make empty updates. ' +
            'Do not block planProgram, getExerciseList, or buildWeek waiting on it. ' +
            'REQUIRED on any mid-chat add of injuries, excluded equipment, excluded areas, movement restrictions, or training preferences - call in the same turn (prefer before mutateProgram when both apply). ' +
            'Add freely when you recognize a new constraint. Remove/relax only on a User-stated change (user asserts the rule no longer applies) or direct the user to Edit profile. ' +
            'Never call removeExcludedEquipment, removeInjuries, removeExcludedAreas, or removeChatRefinements to make a preferred split, template, or exercise set feasible - if profile conflicts with a requested style, adapt the program to the profile; do not edit the profile down. ' +
            'Field map: health/injury → addInjuries; exclude equipment → addExcludedEquipment; exclude areas → addExcludedAreas; ' +
            'split/variability/progression/deload/peak/warmup → preferences; freeform limits → addChatRefinements. ' +
            'Always pass rawStatement when the user spoke the constraint in chat. ' +
            'Examples: questionnaire submit with answers; "my shoulder hurts"; "I don\'t have access to cables"; "no more lunges"; "knee\'s fine now" (User-stated change → removeInjuries); "I got a new barbell".',
        inputSchema: z.object({
            addInjuries: z.array(z.string()).optional().describe('New injury or health issues to add'),
            removeInjuries: z.array(z.string()).optional().describe('Injuries resolved per User-stated change only - never remove to make a program style feasible'),
            addExcludedEquipment: z.array(z.string()).optional().describe('Equipment to exclude'),
            removeExcludedEquipment: z.array(z.string()).optional().describe('Equipment to allow again only on User-stated change - never to enable a preferred split/style'),
            addExcludedAreas: z.array(z.string()).optional().describe('Muscle areas to exclude'),
            removeExcludedAreas: z.array(z.string()).optional().describe('Muscle areas to allow again only on User-stated change - never to enable a preferred split/style'),
            addChatRefinements: z.array(z.string()).optional().describe('Free-form training constraints to add, e.g. "no overhead pressing"'),
            removeChatRefinements: z.array(z.string()).optional().describe('Free-form constraints to remove only on User-stated change - never to enable a preferred split/style'),
            preferences: constraintPreferencesUpdateSchema,
            rawStatement: z.string().optional().describe("The user's exact words expressing this constraint"),
        }),
        execute: async ({ addInjuries, removeInjuries, addExcludedEquipment, removeExcludedEquipment, addExcludedAreas, removeExcludedAreas, addChatRefinements, removeChatRefinements, preferences, rawStatement }) => {
            if (!constraintProfile) {
                return { error: 'No active constraint profile in this session.' };
            }

            const hasArrayChange = [
                addInjuries,
                removeInjuries,
                addExcludedEquipment,
                removeExcludedEquipment,
                addExcludedAreas,
                removeExcludedAreas,
                addChatRefinements,
                removeChatRefinements,
            ].some((arr) => (arr?.length ?? 0) > 0);
            const hasPreferenceChange = Boolean(
                preferences && Object.values(preferences).some((v) => typeof v === 'string' && v.trim() !== ''),
            );
            const hasRawStatement = Boolean(rawStatement?.trim());

            if (!hasArrayChange && !hasPreferenceChange && !hasRawStatement) {
                return { skipped: true as const, reason: 'Nothing to persist - empty update skipped.' };
            }

            const arrayFields = [
                ['injuries',          addInjuries,          removeInjuries],
                ['excludedEquipment', addExcludedEquipment, removeExcludedEquipment],
                ['excludedAreas',     addExcludedAreas,     removeExcludedAreas],
                ['chatRefinements',   addChatRefinements,   removeChatRefinements],
            ] as const satisfies [keyof TConstraintProfile, string[] | undefined, string[] | undefined][];

            for (const [field, add, remove] of arrayFields) {
                constraintProfile[field] = patchStringArray(constraintProfile[field] as string[], add, remove);
            }

            if (preferences) {
                const canonicalEntries = (
                    Object.entries(preferences) as Array<[TConstraintPreferenceKey, string | undefined]>
                )
                    .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
                    .map(([key, v]) => [
                        key,
                        canonicalizeConstraintPreferenceValue(key, v as string),
                    ] as const);
                Object.assign(
                    constraintProfile.preferences,
                    Object.fromEntries(canonicalEntries),
                );
            }

            // Persist to DB for cross-session memory (anonymous users: in-memory only)
            if (workoutHistoryDb && userId) {
                await upsertUserConstraints(workoutHistoryDb, userId, constraintProfile, rawStatement).catch(err => {
                    console.error('[updateConstraintProfile] DB persist failed:', err);
                });
            }

            return { updatedProfile: constraintProfile };
        },
        toModelOutput: async ({ output }) => {
            if ('error' in output) {
                return { type: 'text' as const, value: `Error: ${output.error}` };
            }
            if ('skipped' in output && output.skipped) {
                return { type: 'text' as const, value: output.reason ?? 'Nothing to persist - empty update skipped.' };
            }
            const p = output.updatedProfile;
            const summary = [
                p.injuries.length          && `Injuries: ${p.injuries.join(', ')}`,
                p.excludedEquipment.length && `Excluded equipment: ${p.excludedEquipment.join(', ')}`,
                p.excludedAreas.length     && `Excluded areas: ${p.excludedAreas.join(', ')}`,
                p.chatRefinements.length   && `Refinements: ${p.chatRefinements.join('; ')}`,
            ].filter(Boolean).join(' | ') || 'No active constraints.';
            return { type: 'text' as const, value: `Constraint Profile updated. ${summary}` };
        },
    });

    // Gemini rejects empty-string enum members in tool JSON Schema ("enum[N]: cannot be empty").
    // Clear / unset = null only - never "" in z.enum.
    const updateTrainingProfileTool = tool({
        description:
            'Persist and update the active Training profile (Agentic memory person facts: age, sex, height, experience, physique phase, training focus, activity level, session duration). ' +
            'Call after questionnaire unlock only when Questionnaire advanced / Training profile fields are non-empty; skip entirely when empty - do not make empty updates. ' +
            'Do not block planProgram, getExerciseList, or buildWeek waiting on it. ' +
            'Set freely when the user states a person fact. Clear a field only on a User-stated change (pass null for that field) or direct the user to Edit profile. ' +
            'Not the Mutation constraint gate - use updateConstraintProfile for injuries, exclusions, and training preferences. ' +
            'Examples: questionnaire advanced submit; "I\'m 32"; "I\'m cutting"; "session cap 45 minutes"; "prefer not to say sex" (sex: null).',
        inputSchema: z.object({
            age: z.number().int().min(14).max(100).nullable().optional()
                .describe('Age in years (14-100). null clears on User-stated change only.'),
            sex: z.enum(['male', 'female']).nullable().optional()
                .describe('male | female. null clears / prefer-not-to-say on User-stated change only.'),
            heightCm: z.number().min(120).max(230).nullable().optional()
                .describe('Height in centimeters. null clears on User-stated change only.'),
            experienceLevel: z.enum(['beginner', 'novice', 'intermediate', 'advanced']).nullable().optional()
                .describe('Experience level catalog id. null clears on User-stated change only.'),
            physiquePhase: z.enum(['bulk', 'cut', 'maintain', 'recomp']).nullable().optional()
                .describe('Physique phase catalog id. null clears on User-stated change only.'),
            trainingFocus: z.enum([
                'bodybuilding',
                'powerbuilding',
                'powerlifting',
                'hyrox',
                'crossfit',
                'olympic_weightlifting',
                'calisthenics_bodyweight',
                'athletics_sport',
                'fat_loss',
                'general_fitness',
                'rehab_pain_aware',
            ]).nullable().optional()
                .describe('Training focus catalog id. null clears on User-stated change only.'),
            activityLevel: z.enum(['sedentary', 'light', 'moderate', 'high', 'extreme']).nullable().optional()
                .describe('Activity level short form. null clears on User-stated change only.'),
            sessionDurationMin: z.number().int().min(10).max(180).nullable().optional()
                .describe('Session duration cap in minutes (10-180). null clears on User-stated change only.'),
        }),
        execute: async (input) => {
            if (!trainingProfile) {
                return { error: 'No active Training profile in this session.' };
            }

            const keys = [
                'age',
                'sex',
                'heightCm',
                'experienceLevel',
                'physiquePhase',
                'trainingFocus',
                'activityLevel',
                'sessionDurationMin',
            ] as const;

            const provided = keys.filter((key) => input[key] !== undefined);
            if (provided.length === 0) {
                return { skipped: true as const, reason: 'Nothing to persist - empty update skipped.' };
            }

            for (const key of provided) {
                const value = input[key];
                if (key === 'age' || key === 'heightCm' || key === 'sessionDurationMin') {
                    trainingProfile[key] = value as number | null;
                } else if (key === 'sex') {
                    trainingProfile.sex = (value ?? '') as TTrainingSex;
                } else if (key === 'experienceLevel') {
                    trainingProfile.experienceLevel = (value ?? '') as TExperienceLevel;
                } else if (key === 'physiquePhase') {
                    trainingProfile.physiquePhase = (value ?? '') as TPhysiquePhase;
                } else if (key === 'trainingFocus') {
                    trainingProfile.trainingFocus = (value ?? '') as TTrainingFocus;
                } else if (key === 'activityLevel') {
                    trainingProfile.activityLevel = (value ?? '') as TActivityLevel;
                }
            }

            if (
                trainingProfile.sessionDurationMin != null &&
                trainingProfile.sessionDurationMin % 10 !== 0
            ) {
                trainingProfile.sessionDurationMin =
                    Math.round(trainingProfile.sessionDurationMin / 10) * 10;
            }

            // Persist to DB for cross-session memory (anonymous users: in-memory only)
            if (workoutHistoryDb && userId) {
                await upsertUserTrainingProfile(workoutHistoryDb, userId, trainingProfile).catch((err) => {
                    console.error('[updateTrainingProfile] DB persist failed:', err);
                });
            }

            return { updatedProfile: trainingProfile };
        },
        toModelOutput: async ({ output }) => {
            if ('error' in output) {
                return { type: 'text' as const, value: `Error: ${output.error}` };
            }
            if ('skipped' in output && output.skipped) {
                return { type: 'text' as const, value: output.reason ?? 'Nothing to persist - empty update skipped.' };
            }
            const p = output.updatedProfile;
            const summary = [
                p.age != null && `Age: ${p.age}`,
                p.sex && `Sex: ${p.sex}`,
                p.heightCm != null && `Height: ${p.heightCm} cm`,
                p.experienceLevel && `Experience: ${p.experienceLevel}`,
                p.physiquePhase && `Phase: ${p.physiquePhase}`,
                p.trainingFocus && `Focus: ${p.trainingFocus}`,
                p.activityLevel && `Activity: ${p.activityLevel}`,
                p.sessionDurationMin != null && `Session cap: ${p.sessionDurationMin} min`,
            ].filter(Boolean).join(' | ') || 'No Training profile fields set.';
            return { type: 'text' as const, value: `Training Profile updated. ${summary}` };
        },
    });

    const baseTools = {
        getExerciseList: getExerciseListTool,
        getMoreInfoQuestions: getMoreInfoQuestionsTool,
        openHevyExportGate: openHevyExportGateTool,
        planProgram: planProgramTool,
        readProgram: readProgramTool,
        fetchHevyShareFolder: fetchHevyShareFolderTool,
        importHevyShareFolder: importHevyShareFolderTool,
        buildWeek: buildWeekTool,
        mutateProgram: mutateProgramTool,
        rateProgram: rateProgramTool,
        loadSkill: loadSkillTool,
        readFile: readFileTool,
        bash: bashTool,
        updateConstraintProfile: updateConstraintProfileTool,
        updateTrainingProfile: updateTrainingProfileTool,
    };

    if (hasActiveSubscription && userId && workoutHistoryDb) {
        return {
            ...baseTools,
            getWorkoutHistory: getWorkoutHistoryTool,
            getBodyMeasurements: getBodyMeasurementsTool,
        };
    }

    return baseTools;
}

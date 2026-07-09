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
 *  - planProgram - structured multi-week plan (duration, blocks, progression) before buildWeek
 *  - readProgram - on-demand full program snapshot from the request
 *  - buildWeek - constructs a full week of THevyRoutine days in one call (titles resolved from hevy_exercise_templates by ID)
 *  - mutateProgram - applies typed registry operation batches to the program
 *  - rateProgram - scores the current bodybuilding program (heuristic report card)
 *  - getWorkoutHistory - Pro-only backed-up workout history from Supabase (no live Hevy)
 *
 * Depends on: ai, zod, @/components/program-builder/api/hevy, @/assets/constants
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
    ensureWorkoutHistoryFresh,
    getSyncProgress,
    getWorkoutsForUser,
} from '@/api/workout-history-read';
import { tool } from 'ai';
import type { TConstraintProfile } from '../constraints';
import { validateAgainstConstraints } from '../constraints/validate';
import { upsertUserConstraints } from '@/api/user-constraints';

/** Request-scoped flag: set after first successful buildWeek so the agent cannot call buildWeek twice in one chat turn. */
export interface IBuildWeekOnceGuard {
    locked: boolean;
}

interface IProps {
    excludeAreas?: string;
    excludeEquipment?: string;
    healthIssues?: string;
    hevyProgram?: THevyRoutine[];
    buildWeekOnceGuard?: IBuildWeekOnceGuard;
    /** When false, getWorkoutHistory is omitted from the tool set (Pro-only). */
    hasActiveSubscription?: boolean;
    userId?: string;
    workoutHistoryDb?: TWorkoutHistoryDb;
    /** Structured constraint profile; when provided, updateConstraintProfile tool is included. */
    constraintProfile?: TConstraintProfile;
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

/** Add items to an array, skipping duplicates (case-insensitive). */
function patchStringArray(arr: string[], add?: string[], remove?: string[]): string[] {
    const removeSet = new Set((remove ?? []).map(s => s.toLowerCase()));
    const existing = new Set(arr.map(s => s.toLowerCase()));
    return [
        ...arr.filter(s => !removeSet.has(s.toLowerCase())),
        ...(add ?? []).filter(s => !existing.has(s.toLowerCase()) && !removeSet.has(s.toLowerCase())),
    ];
}

/**
 * Factory that creates the complete tool set for the chat agent. Captures
 * user-specific exclusion filters and the current program in a closure so
 * each tool can reference them without extra round-trips.
 *
 * @param props.excludeAreas - Comma-separated muscle groups to exclude from exercise selection.
 * @param props.excludeEquipment - Comma-separated equipment types to exclude.
 * @param props.healthIssues - Comma-separated health considerations for exercise filtering.
 * @param props.hevyProgram - The user's current Hevy routines (request-body snapshot for readProgram).
 * @returns An object mapping tool names to Vercel AI SDK tool descriptors.
 */
export function getTools({
    excludeAreas,
    excludeEquipment,
    healthIssues,
    hevyProgram,
    buildWeekOnceGuard,
    hasActiveSubscription = false,
    userId,
    workoutHistoryDb,
    constraintProfile,
}: IProps = {}) {

    /** Request-scoped id → canonical title from hevy_exercise_templates (populated by getExerciseList; buildWeek uses it or refetches). */
    const exerciseIdToTitle = new Map<string, string>();

    /** When getExerciseList has not run this turn, load all templates so buildWeek can still validate IDs. */
    async function ensureExerciseIdToTitleMap(): Promise<void> {
        if (exerciseIdToTitle.size > 0) return;
        const all = await getHevyExercises();
        for (const ex of all) {
            if (ex?.id) exerciseIdToTitle.set(ex.id, ex.title);
        }
    }

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
        execute: async ({ name }, { experimental_context }) => {
            const { sandbox, skills, activeToolScope } = experimental_context as {
                sandbox: ISandbox;
                skills: ISkillMetadata[];
                activeToolScope: { allowedTools: string[] | null };
            };

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
        execute: async ({ path }, { experimental_context }) => {
            const { sandbox } = experimental_context as { sandbox: ISandbox };
            return sandbox.readFile(path, 'utf-8');
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
        execute: async ({ command }, { experimental_context }) => {
            const { sandbox } = experimental_context as { sandbox: ISandbox };
            return sandbox.exec(command);
        },
    });

    /**
     * Title: getExerciseListTool
     * Description: Tool that creates first week of workout Program in JSON format.
     * @returns { Tool }
     */
    const getExerciseListTool = tool({

        description: 'Provides access to all available Hevy exercises for building workout programs. Use this tool when users request workout programs. The tool returns a reference list of exercises (ID and title only) - you should then build a complete, well-structured day using exercise IDs, titles, sets, rep_range (for true ranges like 8-12) or reps (for fixed counts like 5 sets x 5 reps), and RPE. For fixed-rep work, set rep_range to null and use reps only. Target 6–7 total exercise rows per training day including warmup(s); see the build-program skill for the session-size default and exceptions.',
        inputSchema: z.object({
            userRequest: z.string().describe('The user\'s workout request or description'),
            excludeAreas: z.string().optional().describe('Comma-separated list of muscle groups to exclude'),
            excludeEquipment: z.string().optional().describe('Comma-separated list of equipment to exclude'),
            healthIssues: z.string().optional().describe('Comma-separated list of health issues to consider'),
        }),

        execute: async ({ userRequest, excludeAreas: agentExcludeAreas, excludeEquipment: agentExcludeEquipment, healthIssues: agentHealthIssues }) => {
            try {
                // Use agent-provided values if available, then constraintProfile, then fall back to closure strings
                const finalExcludeAreas = agentExcludeAreas
                    || (constraintProfile?.excludedAreas.join(', '))
                    || excludeAreas;
                const finalExcludeEquipment = agentExcludeEquipment
                    || (constraintProfile?.excludedEquipment.join(', '))
                    || excludeEquipment;
                const finalHealthIssues = agentHealthIssues
                    || (constraintProfile?.injuries.join(', '))
                    || healthIssues;

                // Fetch all available Hevy exercises
                const exercises = await getHevyExercises();

                // Filter exercises based on exclusions
                let filteredExercises = [...exercises];

                if (finalExcludeEquipment) {
                    const excludedEq = finalExcludeEquipment.split(',').map((e) => e.trim().toLowerCase());
                    filteredExercises = filteredExercises.filter((ex) => {
                        const title = ex.title.toLowerCase();
                        return !excludedEq.some((eq: string) => title.includes(eq));
                    });
                }

                if (finalExcludeAreas) {
                    const excludedAreasList = finalExcludeAreas.split(',').map((e) => e.trim().toLowerCase());
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
                        excludeAreas: finalExcludeAreas,
                        excludeEquipment: finalExcludeEquipment,
                        healthIssues: finalHealthIssues,
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
                value: `Available exercises (${output.totalExercises} total):\n${exerciseList}\n\nCRITICAL: You must ONLY use exercise_template_id values that exist in the list above. Do not invent exercises or use IDs that are not in this list.\n\nSession size reminder: target 6–7 total exercise rows per training day in buildWeek (including the 1–2 warmup rows). A typical day = 1 warmup + 5–6 working exercises. Only go below 6 total if the user explicitly requested a short session, time cap, or deload day.`,
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
     * Title: planProgramTool
     * Description: Records a structured multi-week plan before buildWeek (mesocycles, progression table).
     * @returns { Tool }
     */
    const planProgramTool = tool({
        description:
            'Submit a structured multi-week training plan before calling buildWeek on a **new** program. Use questionnaire answers, program builder context (days/week, length), and your judgment. ' +
            'This does not create routines and does **not** shorten an existing program on the grid — for that use **mutateProgram** **delete_week**. Call once per new program only.',
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
            'Includes day notes, exercise notes, exercise reason, sets, and structure. Call when you need the current program — not on every turn. ' +
            'Sorted by folder_id (week, 0-based) then order (day number 1–7). For **mutateProgram**: folderIds: [folder_id], dayOrder: order. Target exercises/sets by 0-based array position (exerciseIndex, setIndex). ' +
            'For **post-buildWeek periodization**, do not use this for targeting; use **buildWeek** output, **planProgram**, and **folderIds** + **dayOrder**.',
        inputSchema: readProgramInputSchema,
        execute: async () => ({
            hevyProgram: readProgramSnapshot(hevyProgram),
        }),
        toModelOutput: async ({ output }) => {
            const o = output as { hevyProgram?: THevyRoutine[] };
            return {
                type: 'text' as const,
                value: formatReadProgramForModel(o.hevyProgram ?? []),
            };
        },
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
            'Session size: target **6–7 total rows in `exercises[]` per training day** including warmup row(s). Typical day = 1 warmup + 5–6 working exercises. Only drop below 6 total rows if the user explicitly asked for a short/brief session, time cap, deload day, or peaking day with deliberately low volume.',
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
                                            'Short prose (2–4 sentences) explaining why this exercise is here — shown in the UI under "Why this exercise?", not exported to Hevy. ' +
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
                                                weight_kg: z.number().optional().describe('Weight in kg'),
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
                    return {
                        error: 'buildWeek already completed',
                        message:
                            'Week already built in this turn. Use mutateProgram for all edits (reps, RPE, rest, titles, periodization). Do not call buildWeek again.',
                    };
                }

                const timestamp = new Date().toISOString();

                if (!Array.isArray(routines) || routines.length === 0) {
                    return {
                        error: 'Invalid routines',
                        message: 'At least one routine is required',
                    };
                }

                if (routines.length !== totalDays) {
                    return {
                        error: 'Invalid routines',
                        message: 'The number of routines must match totalDays',
                    };
                }

                await ensureExerciseIdToTitleMap();

                for (const routineInput of routines) {
                    const dayNumber = routineInput.dayNumber;
                    if (!Array.isArray(routineInput.exercises) || routineInput.exercises.length === 0) {
                        return {
                            error: 'Invalid exercises',
                            message: `At least one exercise is required for day ${dayNumber}`,
                        };
                    }
                    for (const exercise of routineInput.exercises) {
                        const templateId = (exercise.exercise_template_id ?? '').trim();
                        if (!templateId) {
                            return {
                                error: 'Invalid exercise_template_id',
                                message: `Missing or empty exercise_template_id for day ${dayNumber}. Use getExerciseList and pass a valid ID.`,
                            };
                        }
                        if (!exerciseIdToTitle.has(templateId)) {
                            return {
                                error: 'Invalid exercise_template_id',
                                message: `exercise_template_id "${templateId}" (day ${dayNumber}) is not in hevy_exercise_templates. Call getExerciseList and use only IDs from that list.`,
                            };
                        }
                    }
                }

                const builtRoutines: THevyRoutine[] = [];
                let totalExercises = 0;
                let totalSets = 0;

                for (const routineInput of routines) {
                    const dayNumber = routineInput.dayNumber;

                    if (!Array.isArray(routineInput.exercises) || routineInput.exercises.length === 0) {
                        return {
                            error: 'Invalid exercises',
                            message: `At least one exercise is required for day ${dayNumber}`,
                        };
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
                    const allExercises = await getHevyExercises();
                    const templateMap = new Map(allExercises.map(e => [e.id, e]));
                    const exerciseMeta = builtRoutines.flatMap(r =>
                        r.exercises.map(e => templateMap.get(e.exercise_template_id) ?? { title: e.title }),
                    );
                    const validation = validateAgainstConstraints(constraintProfile, exerciseMeta);
                    if (!validation.valid) {
                        const lines = validation.violations
                            .map(({ exerciseTitle, reason }) => `- ${exerciseTitle}: ${reason}`)
                            .join('\n');
                        return {
                            error: 'constraint_violation',
                            message: `Fix these exercises and call buildWeek again:\n${lines}`,
                        };
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
                return {
                    error: 'Failed to build week',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },

        toModelOutput: async ({ output }) => {
            if (output.error) {
                return {
                    type: 'text' as const,
                    value: `Error: ${output.message || 'Failed to build week'}`,
                };
            }

            const titles = Array.isArray(output.routines)
                ? output.routines.map((r: THevyRoutine) => r.title).join(', ')
                : '';

            return {
                type: 'text' as const,
                value: `Week complete (${output.totalDays} days): ${titles || 'No routine titles'} (${output.exerciseCount} exercises, ${output.setCount} sets). Do not call buildWeek again; use mutateProgram for any changes.`,
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
                            return {
                                error: 'Program mutation batch failed',
                                failures: [{ index, op: operation.op, reason: resolved.reason }],
                            };
                        }
                        resolvedOperations.push({ ...operation, exercise: resolved.payload });
                    } else if (operation.op === 'swap_exercise_template') {
                        if (operation.preserve_sets === false) {
                            const resolved = resolveExercisePayload(
                                operation.to as TInsertExercisePayload,
                                exerciseIdToTitle,
                            );
                            if (resolved.ok === false) {
                                return {
                                    error: 'Program mutation batch failed',
                                    failures: [{ index, op: operation.op, reason: resolved.reason }],
                                };
                            }
                            resolvedOperations.push({ ...operation, to: resolved.payload });
                        } else {
                            const resolved = resolveSwapTemplateTo(
                                operation.to as TSwapExerciseTemplateMinimalTo,
                                exerciseIdToTitle,
                            );
                            if (resolved.ok === false) {
                                return {
                                    error: 'Program mutation batch failed',
                                    failures: [{ index, op: operation.op, reason: resolved.reason }],
                                };
                            }
                            resolvedOperations.push({ ...operation, to: resolved.payload });
                        }
                    } else {
                        resolvedOperations.push(operation);
                    }
                }

                if (constraintProfile) {
                    const allExercises = await getHevyExercises();
                    const templateMap = new Map(allExercises.map(e => [e.id, e]));
                    const incomingExercises = resolvedOperations
                        .filter(op => op.op === 'insert_exercise' || op.op === 'edit_exercise' || op.op === 'swap_exercise_template')
                        .flatMap(op => {
                            const id = 'exercise' in op ? op.exercise?.exercise_template_id
                                : 'to' in op ? (op.to as { exercise_template_id?: string }).exercise_template_id
                                : undefined;
                            const tmpl = id ? templateMap.get(id) : undefined;
                            return tmpl ? [tmpl] : [];
                        });
                    const validation = validateAgainstConstraints(constraintProfile, incomingExercises);
                    if (!validation.valid) {
                        const lines = validation.violations
                            .map(({ exerciseTitle, reason }) => `- ${exerciseTitle}: ${reason}`)
                            .join('\n');
                        return {
                            error: 'constraint_violation',
                            message: `Mutation rejected — constraint violations:\n${lines}`,
                        };
                    }
                }

                const result = applyOperations(hevyProgram ?? [], resolvedOperations);
                if (isApplyBatchFailure(result)) {
                    return {
                        error: 'Program mutation batch failed',
                        failures: result.failures,
                    };
                }
                return { operations: resolvedOperations };
            } catch (error) {
                console.error('Error in mutateProgramTool:', error);
                return {
                    error: 'Failed to validate mutation batch',
                    failures: [
                        {
                            index: 0,
                            op: operations[0]?.op ?? 'unknown',
                            reason: error instanceof Error ? error.message : 'Unknown error',
                        },
                    ],
                };
            }
        },
        toModelOutput: async ({ output }) => {
            if (output && typeof output === 'object' && 'error' in output && output.error) {
                const o = output as {
                    error: string;
                    failures?: Array<{ index: number; op: string; reason: string }>;
                };
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
            'Returns the user\'s backed-up workout history from their Hevy sync (Supabase backup — not a live Hevy API call). ' +
            'Use when they ask about logged training: past weights, reps, sessions, volume, or questions like "what did I bench last month?". ' +
            `Choose the smallest limit that answers the question (typical 5–15; hard cap ${AGENT_WORKOUT_HISTORY_MAX}). ` +
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

    const rateProgramTool = tool({
        description:
            'Heuristic report card (volume, frequency, categories, rep variety, session size). ' +
            'Call only when the user explicitly asks to rate their program (same intent as the "Rate my program" chip). ' +
            'Do not call for "how do I improve", generic review, or critique—use readProgram and reply in chat. ' +
            'Uses the same request-start snapshot as readProgram.',
        inputSchema: z.object({
            reason: z.string().optional().describe('Short note on why the rating was requested'),
        }),
        execute: async () => {
            try {
                const templates = await getHevyExercises();
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
            'Update the active constraint profile when the user mentions new injuries, equipment restrictions, movement limitations, or training preferences mid-conversation. ' +
            'Call this whenever the user adds or removes a constraint. ' +
            'Examples: "my shoulder hurts", "I don\'t have access to cables", "no more lunges", "I got a new barbell".',
        inputSchema: z.object({
            addInjuries: z.array(z.string()).optional().describe('New injury or health issues to add'),
            removeInjuries: z.array(z.string()).optional().describe('Injuries that are resolved and should be removed'),
            addExcludedEquipment: z.array(z.string()).optional().describe('Equipment to exclude'),
            removeExcludedEquipment: z.array(z.string()).optional().describe('Equipment to allow again'),
            addExcludedAreas: z.array(z.string()).optional().describe('Muscle areas to exclude'),
            removeExcludedAreas: z.array(z.string()).optional().describe('Muscle areas to allow again'),
            addChatRefinements: z.array(z.string()).optional().describe('Free-form training constraints to add, e.g. "no overhead pressing"'),
            removeChatRefinements: z.array(z.string()).optional().describe('Free-form constraints to remove'),
            preferences: z.object({
                splitType: z.string().optional(),
                exerciseVariability: z.string().optional(),
                progressionSystem: z.string().optional(),
                deloadWeek: z.string().optional(),
                peakWeek: z.string().optional(),
            }).optional().describe('Preference fields to update (only provided keys are changed)'),
            rawStatement: z.string().optional().describe("The user's exact words expressing this constraint"),
        }),
        execute: async ({ addInjuries, removeInjuries, addExcludedEquipment, removeExcludedEquipment, addExcludedAreas, removeExcludedAreas, addChatRefinements, removeChatRefinements, preferences, rawStatement }) => {
            if (!constraintProfile) {
                return { error: 'No active constraint profile in this session.' };
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
                Object.assign(
                    constraintProfile.preferences,
                    Object.fromEntries(Object.entries(preferences).filter(([, v]) => v)),
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
            const p = output.updatedProfile;
            const summary = [
                p.injuries.length          && `Injuries: ${p.injuries.join(', ')}`,
                p.excludedEquipment.length && `Excluded equipment: ${p.excludedEquipment.join(', ')}`,
                p.excludedAreas.length     && `Excluded areas: ${p.excludedAreas.join(', ')}`,
                p.chatRefinements.length   && `Refinements: ${p.chatRefinements.join('; ')}`,
            ].filter(Boolean).join(' | ') || 'No active constraints.';
            return { type: 'text' as const, value: `Constraint profile updated. ${summary}` };
        },
    });

    const baseTools = {
        getExerciseList: getExerciseListTool,
        getMoreInfoQuestions: getMoreInfoQuestionsTool,
        planProgram: planProgramTool,
        readProgram: readProgramTool,
        buildWeek: buildWeekTool,
        mutateProgram: mutateProgramTool,
        rateProgram: rateProgramTool,
        loadSkill: loadSkillTool,
        readFile: readFileTool,
        bash: bashTool,
        updateConstraintProfile: updateConstraintProfileTool,
    };

    if (hasActiveSubscription && userId && workoutHistoryDb) {
        return {
            ...baseTools,
            getWorkoutHistory: getWorkoutHistoryTool,
        };
    }

    return baseTools;
}

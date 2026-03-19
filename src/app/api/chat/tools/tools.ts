/**
 * @module chat/tools
 *
 * Defines all Vercel AI SDK tools available to the "Andy" ToolLoopAgent.
 * Each tool is a `tool()` descriptor with a Zod input schema, an `execute`
 * handler, and a `toModelOutput` transformer that minimises token usage by
 * returning only a summary to the LLM while sending full data to the client.
 *
 * Tools provided:
 *  - getExerciseList – fetches and filters available Hevy exercises
 *  - getMoreInfoQuestions – opens the pre-build questionnaire UI
 *  - planProgram – structured multi-week plan (duration, blocks, progression) before buildWeek
 *  - getCurrentProgram – returns the live program state
 *  - buildWeek – constructs a full week of THevyRoutine days in one call
 *  - modifyProgram – applies RFC 6902 JSON Patch edits to the program
 *
 * Depends on: ai, zod, @/components/program-builder/api/hevy, @/assets/constants
 * Used by: /api/chat/route.ts (passed to ToolLoopAgent)
 */

import { z } from 'zod';
import { getHevyExercises } from '@/components/program-builder/api/hevy';
import { sampleQuestions } from '@/assets/constants';
import { tool } from 'ai';

interface IProps {
    excludeAreas?: string;
    excludeEquipment?: string;
    healthIssues?: string;
    hevyProgram?: THevyRoutine[];
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

/** Exported for tests — same schema as planProgram tool input. */
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

/**
 * Factory that creates the complete tool set for the chat agent. Captures
 * user-specific exclusion filters and the current program in a closure so
 * each tool can reference them without extra round-trips.
 *
 * @param props.excludeAreas - Comma-separated muscle groups to exclude from exercise selection.
 * @param props.excludeEquipment - Comma-separated equipment types to exclude.
 * @param props.healthIssues - Comma-separated health considerations for exercise filtering.
 * @param props.hevyProgram - The user's current Hevy routines (used by getCurrentProgram).
 * @returns An object mapping tool names to Vercel AI SDK tool descriptors.
 */
export function getTools({ excludeAreas, excludeEquipment, healthIssues, hevyProgram }: IProps = {}) {

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

        description: 'Provides access to all available Hevy exercises for building workout programs. Use this tool when users request workout programs. The tool returns a reference list of exercises (ID and title only) - you should then return a minimal workout structure (TTextToJsonResponse format) with just exercise IDs, titles, sets, reps, and RPE.',
        inputSchema: z.object({
            userRequest: z.string().describe('The user\'s workout request or description'),
            excludeAreas: z.string().optional().describe('Comma-separated list of muscle groups to exclude'),
            excludeEquipment: z.string().optional().describe('Comma-separated list of equipment to exclude'),
            healthIssues: z.string().optional().describe('Comma-separated list of health issues to consider'),
        }),

        execute: async ({ userRequest, excludeAreas: agentExcludeAreas, excludeEquipment: agentExcludeEquipment, healthIssues: agentHealthIssues }) => {
            try {
                // Use agent-provided values if available, otherwise fall back to closure values
                const finalExcludeAreas = agentExcludeAreas || excludeAreas;
                const finalExcludeEquipment = agentExcludeEquipment || excludeEquipment;
                const finalHealthIssues = agentHealthIssues || healthIssues;

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
                value: `Available exercises (${output.totalExercises} total):\n${exerciseList}\n\nCRITICAL: You must ONLY use exercise_template_id values that exist in the list above. Do not invent exercises or use IDs that are not in this list.`,
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
            'Submit a structured multi-week training plan before calling buildWeek. Use questionnaire answers, program builder context (days/week, length), and your judgment. ' +
            'This does not create routines; it anchors periodization for later modifyProgram patches. Call once per new program.',
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
                value: `Plan recorded: ${o.summary ?? 'OK'}. Proceed with getExerciseList and buildWeek, then apply periodization with modifyProgram.`,
            };
        },
    });

    /**
     * Title: getCurrentProgramTool
     * Description: Tool to check if a program currently exists before creating a new one or modifying an existing one.
     * @returns { Tool }
     */
    const getCurrentProgramTool = tool({
        description: 'Returns the current workout program state in JSON format. Use this tool to check what program currently exists before creating a new one or modifying an existing one.',
        inputSchema: z.object({
            reason: z.string().optional().describe('Optional reason for checking the current program state'),
        }),
        execute: async () => {

            return {
            currentProgram: hevyProgram,
            hasProgram: hevyProgram && hevyProgram.length > 0,
            message: hevyProgram && hevyProgram.length > 0
                ? 'A program currently exists in JSON format. You can modify it or create a new one based on user requests. Always return programs in JSON format as a THevyRoutine[] array.'
                : 'No program currently exists. Create a new program based on user requests. Always return programs in JSON format as a THevyRoutine[] array.',
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
            'Builds an entire week of routines/days for the workout program in a SINGLE call. ' +
            'Provide all days in order (Day 1, Day 2, …) so the UI can duplicate the first week across the remaining weeks. ' +
            'IMPORTANT: Always provide a valid JSON object with the required fields.',
        inputSchema: z.object({
            totalDays: z.number().min(1).max(7).describe('Total number of days in the program week (1–7).'),
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
                                    title: z.string().describe('The exercise title'),
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
                                        .max(200)
                                        .optional()
                                        .describe(
                                            'Short reason why this exercise was selected (1 sentence; shown in UI tooltip only, not exported).',
                                        ),
                                    sets: z
                                        .array(
                                            z.object({
                                                type: z
                                                    .enum(['normal', 'warmup', 'dropset', 'failure'])
                                                    .describe('The type of set'),
                                                reps: z.number().describe('Number of reps'),
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
                        const sets = (exercise.sets || []).map((set, setIndex) => ({
                            index: setIndex,
                            type: set.type || 'normal',
                            reps: set.reps ?? 10,
                            weight_kg: set.weight_kg ?? null,
                            rpe: set.rpe ?? null,
                            distance_meters: null,
                            duration_seconds: null,
                            custom_metric: null,
                        }));

                        totalSets += sets.length;

                        return {
                            index: exerciseIndex,
                            title: exercise.title || 'Unknown Exercise',
                            notes: exercise.notes || '',
                            rest_seconds: exercise.rest_seconds || '90',
                            exercise_template_id: exercise.exercise_template_id || '',
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
                value: `Week complete (${output.totalDays} days): ${titles || 'No routine titles'} (${output.exerciseCount} exercises, ${output.setCount} sets).`,
            };
        },
    });

    const VALID_PATCH_OPS = ['add', 'remove', 'replace', 'move', 'copy', 'test'] as const;
    type ValidPatchOp = (typeof VALID_PATCH_OPS)[number];
    /** Coerce LLM typos/hallucinations (e.g. "replace_seconds") to a valid JSON Patch op. */
    const canonicalizePatchOp = (val: unknown): ValidPatchOp => {
        const s = typeof val === 'string' ? val.toLowerCase().trim() : '';
        if (VALID_PATCH_OPS.includes(s as ValidPatchOp)) return s as ValidPatchOp;
        if (s.startsWith('replace')) return 'replace';
        if (s.startsWith('add')) return 'add';
        if (s.startsWith('remove') || s.startsWith('remov')) return 'remove';
        if (s.startsWith('move')) return 'move';
        if (s.startsWith('copy')) return 'copy';
        if (s.startsWith('test')) return 'test';
        return 'replace';
    };

    /**
     * JSON Patch operation schema (RFC 6902). Paths are JSON Pointers; document root is the THevyRoutine[] array.
     * op is coerced so typos like "replace_seconds" become "replace".
     */
    const jsonPatchOperationSchema = z.object({
        op: z.string().transform(canonicalizePatchOp).describe('Operation type: add, remove, replace, move, copy, or test (typos like replace_seconds are coerced to replace).'),
        path: z.string().describe('JSON Pointer to the target property (e.g. /0/title, /0/exercises/1/sets/0/reps). Must contain only property names and array indices — never append the value to the path (e.g. /0/.../rpe:7 is WRONG; use /0/.../rpe and put 7 in value).'),
        value: z.unknown().optional().describe('Value for add, replace, test'),
        from: z.string().optional().describe('JSON Pointer for move/copy source'),
    });

    /**
     * Title: modifyProgramTool
     * Description: Modifies the current workout program by applying a JSON Patch (RFC 6902). Call getCurrentProgram first to see the current state.
     * @returns { Tool }
     */
    const modifyProgramTool = tool({
        description: 'Modifies the current workout program using a JSON Patch. Call getCurrentProgram first to get the current program state. The document root is the **full routines array** (length = daysPerWeek × weeks, e.g. 48 for 6 days × 8 weeks). Paths use **zero-based indices**: /0 through /N-1 for all routines. IMPORTANT: each path must end with the property name only (e.g. /0/exercises/0/sets/0/rpe) — put the new value in the "value" field, never in the path (e.g. .../rpe:7 is WRONG). The patch array can contain **any number of operations** (e.g. 160 or 1296); for program-wide edits (e.g. convert all to dumbbell), include one operation per routine (or per routine per exercise) so that every index that needs changing is targeted. Use when the user asks to change, edit, or update an existing program (e.g. rename a day, change reps/sets, add/remove an exercise). Path examples: /0 = first routine, /0/title = first routine title, /0/exercises/1 = second exercise of first routine, /0/exercises/0/sets/2/reps = reps of third set of first exercise.',
        inputSchema: z.object({
            patch: z.array(jsonPatchOperationSchema).min(1).describe('Array of JSON Patch operations (add, remove, replace, move, copy, test). At least one operation required.'),
        }),
        execute: async ({ patch }) => {
            try {
                return { patch };
            } catch (error) {
                console.error('Error in modifyProgramTool:', error);
                return {
                    error: 'Failed to prepare patch',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },

        toModelOutput: async ({ output }) => {
            if (output.error) {
                return {
                    type: 'text' as const,
                    value: `Error: ${output.message || 'Failed to prepare patch'}`,
                };
            }
            return {
                type: 'text' as const,
                value: `Modify program patch (${output.patch?.length ?? 0} operations) will be applied on the client.`,
            };
        },
    });

    return {
        getExerciseList: getExerciseListTool,
        getMoreInfoQuestions: getMoreInfoQuestionsTool,
        planProgram: planProgramTool,
        getCurrentProgram: getCurrentProgramTool,
        buildWeek: buildWeekTool,
        modifyProgram: modifyProgramTool,
        loadSkill: loadSkillTool,
        readFile: readFileTool,
        bash: bashTool,
    };
}

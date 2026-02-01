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

/**
 * Title: getTools
 * Description: Factory function that creates tools with closure access to excludeAreas, excludeEquipment, healthIssues, and hevyProgram.
 * @param params { IGetToolsParams } - Parameters to be captured in closure
 * @returns { Object } - Tools object with getExerciseList, getMoreInfoQuestions, and getCurrentProgram
 */
export function getTools({ excludeAreas, excludeEquipment, healthIssues, hevyProgram }: IProps = {}) {
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
     * Title: buildRoutineTool
     * Description: Tool to build a single routine/day for the workout program.
     * @returns { Tool }
     */
    const buildRoutineTool = tool({
        description: 'Builds a single routine/day for the workout program. Call this tool ONCE for each day in the program. For example, for a 4-day program, call this tool 4 times (Day 1, Day 2, Day 3, Day 4). The UI will show progress as each day completes. IMPORTANT: Always provide a valid JSON object with the required fields.',
        inputSchema: z.object({
            dayNumber: z.number().describe('The day number (1, 2, 3, etc.) - must be called in order'),
            totalDays: z.number().describe('Total number of days in the program'),
            title: z.string().describe('The routine/day title (e.g., "Push Day", "Upper Body")'),
            notes: z.string().default('').describe('Notes for the routine (optional)'),
            exercises: z.array(z.object({
                exercise_template_id: z.string().describe('The exercise ID from the getExerciseList results - MUST be an exact match'),
                title: z.string().describe('The exercise title'),
                notes: z.string().default('').describe('Notes for the exercise (optional)'),
                rest_seconds: z.string().default('90').describe('Rest time in seconds between sets'),
                supersets_id: z.number().nullable().default(null).describe('Superset ID if part of a superset'),
                sets: z.array(z.object({
                    type: z.enum(['normal', 'warmup', 'dropset', 'failure']).describe('The type of set'),
                    reps: z.number().describe('Number of reps'),
                    rpe: z.number().optional().describe('RPE (Rate of Perceived Exertion) 1-10'),
                    weight_kg: z.number().optional().describe('Weight in kg'),
                })).min(1).describe('Array of sets for this exercise - at least 1 set required'),
            })).min(1).describe('Array of exercises for this routine - at least 1 exercise required'),
        }),

        execute: async ({ dayNumber, totalDays, title, notes, exercises }) => {
            try {
                const timestamp = new Date().toISOString();

                // Validate inputs
                if (!Array.isArray(exercises) || exercises.length === 0) {
                    return {
                        error: 'Invalid exercises',
                        message: 'At least one exercise is required',
                    };
                }

                // Build a single THevyRoutine
                const routine: THevyRoutine = {
                    id: String(dayNumber),
                    title: title || `Day ${dayNumber}`,
                    folder_id: 0, // Week 1 = folder_id 0
                    order: String(dayNumber),
                    notes: notes || '',
                    created_at: timestamp,
                    updated_at: timestamp,
                    exercises: exercises.map((exercise, exerciseIndex) => ({
                        index: exerciseIndex,
                        title: exercise.title || 'Unknown Exercise',
                        notes: exercise.notes || '',
                        rest_seconds: exercise.rest_seconds || '90',
                        exercise_template_id: exercise.exercise_template_id || '',
                        supersets_id: exercise.supersets_id ?? null,
                        sets: (exercise.sets || []).map((set, setIndex) => ({
                            index: setIndex,
                            type: set.type || 'normal',
                            reps: set.reps ?? 10,
                            weight_kg: set.weight_kg ?? null,
                            rpe: set.rpe ?? null,
                            distance_meters: null,
                            duration_seconds: null,
                            custom_metric: null,
                        })),
                    })),
                };

                return {
                    routine,
                    dayNumber,
                    totalDays,
                    exerciseCount: exercises.length,
                    setCount: exercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0),
                };

            } catch (error) {
                console.error('Error in buildRoutineTool:', error);
                return {
                    error: 'Failed to build routine',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        },

        toModelOutput: async ({ output }) => {
            if (output.error) {
                return {
                    type: 'text' as const,
                    value: `Error: ${output.message || 'Failed to build routine'}`,
                };
            }

            // Return minimal summary - UI extracts routine data from part.output
            return {
                type: 'text' as const,
                value: `Day ${output.dayNumber}/${output.totalDays} complete: ${output?.routine?.title ? output.routine.title : 'No routine title'} (${output.exerciseCount} exercises, ${output.setCount} sets)`,
            };
        },
    });

    /**
     * JSON Patch operation schema (RFC 6902). Paths are JSON Pointers; document root is the THevyRoutine[] array.
     */
    const jsonPatchOperationSchema = z.object({
        op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']).describe('Operation type'),
        path: z.string().describe('JSON Pointer to the target (e.g. /0/title, /0/exercises/1/sets/0/reps)'),
        value: z.unknown().optional().describe('Value for add, replace, test'),
        from: z.string().optional().describe('JSON Pointer for move/copy source'),
    });

    /**
     * Title: modifyProgramTool
     * Description: Modifies the current workout program by applying a JSON Patch (RFC 6902). Call getCurrentProgram first to see the current state.
     * @returns { Tool }
     */
    const modifyProgramTool = tool({
        description: 'Modifies the current workout program using a JSON Patch. Call getCurrentProgram first to get the current program state. The document root is the **full routines array** (length = daysPerWeek × weeks, e.g. 48 for 6 days × 8 weeks). Paths use **zero-based indices**: /0 through /N-1 for all routines. The patch array can contain **any number of operations** (e.g. 160 or 1296); for program-wide edits (e.g. convert all to dumbbell), include one operation per routine (or per routine per exercise) so that every index that needs changing is targeted. Use when the user asks to change, edit, or update an existing program (e.g. rename a day, change reps/sets, add/remove an exercise). Path examples: /0 = first routine, /0/title = first routine title, /0/exercises/1 = second exercise of first routine, /0/exercises/0/sets/2/reps = reps of third set of first exercise.',
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
        getCurrentProgram: getCurrentProgramTool,
        buildRoutine: buildRoutineTool,
        modifyProgram: modifyProgramTool,
    };
}

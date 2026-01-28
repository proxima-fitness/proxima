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
        inputSchema: z.object({}),
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
        description: 'Builds a single routine/day for the workout program. Call this tool ONCE for each day in the program. For example, for a 4-day program, call this tool 4 times (Day 1, Day 2, Day 3, Day 4). The UI will show progress as each day completes.',
        inputSchema: z.object({
            dayNumber: z.number().describe('The day number (1, 2, 3, etc.) - must be called in order'),
            totalDays: z.number().describe('Total number of days in the program'),
            title: z.string().describe('The routine/day title (e.g., "Push Day", "Upper Body")'),
            notes: z.string().optional().describe('Optional notes for the routine'),
            exercises: z.array(z.object({
                exercise_template_id: z.string().describe('The exercise ID from the getExerciseList results - MUST be an exact match'),
                title: z.string().describe('The exercise title'),
                notes: z.string().optional().describe('Optional notes for the exercise'),
                rest_seconds: z.string().nullable().optional().describe('Rest time in seconds between sets'),
                supersets_id: z.number().nullable().optional().describe('Superset ID if part of a superset'),
                sets: z.array(z.object({
                    type: z.enum(['normal', 'warmup', 'dropset', 'failure']).describe('The type of set'),
                    reps: z.number().nullable().optional().describe('Number of reps'),
                    weight_kg: z.number().nullable().optional().describe('Weight in kg'),
                    rpe: z.number().nullable().optional().describe('RPE (Rate of Perceived Exertion) 1-10'),
                    distance_meters: z.number().nullable().optional().describe('Distance in meters'),
                    duration_seconds: z.number().nullable().optional().describe('Duration in seconds'),
                    custom_metric: z.number().nullable().optional().describe('Custom metric value'),
                })).describe('Array of sets for this exercise'),
            })).describe('Array of exercises for this routine'),
        }),

        execute: async ({ dayNumber, totalDays, title, notes, exercises }) => {
            try {
                const timestamp = new Date().toISOString();

                // Build a single THevyRoutine
                const routine: THevyRoutine = {
                    id: String(dayNumber),
                    title: title,
                    folder_id: 0, // Week 1 = folder_id 0
                    order: String(dayNumber),
                    notes: notes || '',
                    created_at: timestamp,
                    updated_at: timestamp,
                    exercises: exercises.map((exercise, exerciseIndex) => ({
                        index: exerciseIndex,
                        title: exercise.title,
                        notes: exercise.notes || '',
                        rest_seconds: exercise.rest_seconds ?? null,
                        exercise_template_id: exercise.exercise_template_id,
                        supersets_id: exercise.supersets_id ?? null,
                        sets: exercise.sets.map((set, setIndex) => ({
                            index: setIndex,
                            type: set.type,
                            reps: set.reps ?? null,
                            weight_kg: set.weight_kg ?? null,
                            rpe: set.rpe ?? null,
                            distance_meters: set.distance_meters ?? null,
                            duration_seconds: set.duration_seconds ?? null,
                            custom_metric: set.custom_metric ?? null,
                        })),
                    })),
                };

                return {
                    routine,
                    dayNumber,
                    totalDays,
                    exerciseCount: exercises.length,
                    setCount: exercises.reduce((sum, e) => sum + e.sets.length, 0),
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

    return {
        getExerciseList: getExerciseListTool,
        getMoreInfoQuestions: getMoreInfoQuestionsTool,
        getCurrentProgram: getCurrentProgramTool,
        buildRoutine: buildRoutineTool,
    };
}

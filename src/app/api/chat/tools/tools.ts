import { z } from 'zod';
import { getHevyExercises } from '@/components/program-builder/api/hevy';
import { encode } from '@toon-format/toon';
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
     * Description: Tool that creates first week of workout Program in TOON format.
     * @returns { Tool }
     */
    const getExerciseListTool = tool({

        description: 'Provides access to all available Hevy exercises for building workout programs. Use this tool when users request workout programs. The tool returns a reference list of exercises (ID and title only) - you should then return a minimal workout structure (TTextToJsonResponse format) with just exercise IDs, titles, sets, reps, and RPE.',
        inputSchema: z.object({
            userRequest: z.string().describe('The user\'s workout request or description'),
            daysPerWeek: z.number().optional().describe('Number of workout days per week (1-7)'),
            programLength: z.number().optional().describe('Program length in weeks (defaults to 12 unless specified otherwise)'),
            excludeAreas: z.string().optional().describe('Comma-separated list of muscle groups to exclude'),
            excludeEquipment: z.string().optional().describe('Comma-separated list of equipment to exclude'),
            healthIssues: z.string().optional().describe('Comma-separated list of health issues to consider'),
        }),

        execute: async ({ userRequest, daysPerWeek, programLength, excludeAreas: agentExcludeAreas, excludeEquipment: agentExcludeEquipment, healthIssues: agentHealthIssues }) => {
            try {
                console.log("entered getExerciseListTool execute");
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
                        daysPerWeek: daysPerWeek,
                        programLength: programLength,
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
            console.log("entered toModelOutput");
            // Return minimal data for AI context to reduce token usage
            // Only send IDs and titles instead of full exercise metadata
            if (output.error) {
                return {
                    type: 'text' as const,
                    value: `Error: ${output.message || 'Failed to fetch exercises'}`,
                };
            }

            const exerciseList = output?.availableExercises?.map(ex => `${ex.id}: ${ex.title}`).join('\n') || '';

            console.log('exerciseList', exerciseList);

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
                console.log("entered getMoreInfoQuestionsTool execute");
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
        description: 'Returns the current workout program state in TOON format. Use this tool to check what program currently exists before creating a new one or modifying an existing one.',
        inputSchema: z.object({}),
        execute: async () => {
            const programToon = hevyProgram && hevyProgram.length > 0 ? encode(hevyProgram) : null;
            return {
            currentProgram: programToon,
            hasProgram: hevyProgram && hevyProgram.length > 0,
            message: hevyProgram && hevyProgram.length > 0
                ? 'A program currently exists in TOON format. You can modify it or create a new one based on user requests. Always return programs in TOON format.'
                : 'No program currently exists. Create a new program based on user requests. Always return programs in TOON format.',
            };
        },
    });

    return {
        getExerciseList: getExerciseListTool,
        getMoreInfoQuestions: getMoreInfoQuestionsTool,
        getCurrentProgram: getCurrentProgramTool,
    };
}

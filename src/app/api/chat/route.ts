import { ToolLoopAgent, createAgentUIStreamResponse, gateway, tool } from 'ai';
import { z } from 'zod';
import { getHevyExercises } from '@/components/program-builder/api/hevy';

// Define the buildWorkoutProgram tool
const buildWorkoutProgramTool = tool({
  description: 'Provides access to all available Hevy exercises for building workout programs. Use this tool when users request workout programs. The tool returns a reference list of exercises (ID and title only) - you should then return a minimal workout structure (TTextToJsonResponse format) with just exercise IDs, titles, sets, reps, and RPE.',
  inputSchema: z.object({
    userRequest: z.string().describe('The user\'s workout request or description'),
    daysPerWeek: z.number().optional().describe('Number of workout days per week (1-7)'),
    programLength: z.number().optional().describe('Program length in weeks (defaults to 12 unless specified otherwise)'),
    excludeAreas: z.string().optional().describe('Comma-separated list of muscle groups to exclude'),
    excludeEquipment: z.string().optional().describe('Comma-separated list of equipment to exclude'),
    healthIssues: z.string().optional().describe('Comma-separated list of health issues to consider'),
  }),
  execute: async ({ userRequest, daysPerWeek, programLength, excludeAreas, excludeEquipment, healthIssues }) => {
    try {
      console.log("entered buildWorkoutProgramTool execute");
      // Fetch all available Hevy exercises
      const exercises = await getHevyExercises();

      // Filter exercises based on exclusions
      let filteredExercises = [...exercises];

      if (excludeEquipment) {
        const excludedEq = excludeEquipment.split(',').map((e) => e.trim().toLowerCase());
        filteredExercises = filteredExercises.filter((ex) => {
          const title = ex.title.toLowerCase();
          return !excludedEq.some((eq: string) => title.includes(eq));
        });
      }

      if (excludeAreas) {
        const excludedAreasList = excludeAreas.split(',').map((e) => e.trim().toLowerCase());
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
          excludeAreas,
          excludeEquipment,
          healthIssues,
        },
        note: 'CRITICAL: You must ONLY use exercise_template_id values that exist in the availableExercises array. Do not invent exercises or use IDs that are not in this list.',
      };
    } catch (error) {
      console.error('Error in buildWorkoutProgram tool:', error);
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

    const exerciseList = output?.availableExercises
      ?.map(ex => `${ex.id}: ${ex.title}`)
      .join('\n') || '';

    console.log('exerciseList', exerciseList);

    return {
      type: 'text' as const,
      value: `Available exercises (${output.totalExercises} total):\n${exerciseList}\n\nCRITICAL: You must ONLY use exercise_template_id values that exist in the list above. Do not invent exercises or use IDs that are not in this list.`,
    };
  },
});

export const baseTools = {
  buildWorkoutProgram: buildWorkoutProgramTool,
};

// Function to create agent with current program context
function createAgentWithProgram(
  hevyProgram: THevyRoutine[] | undefined,
  daysPerWeek?: number,
  programLength?: number,
  excludeAreas?: string,
  excludeEquipment?: string,
  healthIssues?: string
) {
  // Create getCurrentProgram tool if program exists
  const getCurrentProgramTool = tool({
    description: 'Returns the current workout program state. Use this tool to check what program currently exists before creating a new one or modifying an existing one.',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        currentProgram: hevyProgram || null,
        hasProgram: hevyProgram && hevyProgram.length > 0,
        message: hevyProgram && hevyProgram.length > 0
          ? 'A program currently exists. You can modify it or create a new one based on user requests.'
          : 'No program currently exists. Create a new program based on user requests.',
      };
    },
  });

  const tools = hevyProgram && hevyProgram.length > 0
    ? { ...baseTools, getCurrentProgram: getCurrentProgramTool }
    : baseTools;

  // Build context about provided parameters
  const providedParams: string[] = [];
  if (daysPerWeek !== undefined && daysPerWeek !== null) {
    providedParams.push(`daysPerWeek: ${daysPerWeek}`);
  }
  if (programLength !== undefined && programLength !== null) {
    providedParams.push(`programLength: ${programLength} weeks`);
  }
  if (excludeAreas) {
    providedParams.push(`excludeAreas: ${excludeAreas}`);
  }
  if (excludeEquipment) {
    providedParams.push(`excludeEquipment: ${excludeEquipment}`);
  }
  if (healthIssues) {
    providedParams.push(`healthIssues: ${healthIssues}`);
  }

  const paramsContext = providedParams.length > 0
    ? `\n\nPROVIDED PROGRAM PARAMETERS:\n${providedParams.map(p => `- ${p}`).join('\n')}\n\nCRITICAL: When calling buildWorkoutProgram, you MUST use these provided parameter values. Do NOT infer or guess these values from the user's message - use the provided values above.`
    : '\n\nNOTE: No program parameters were provided. You MUST extract daysPerWeek and other parameters from the user\'s message. Look for phrases like "3 days per week", "5x/week", "train 4 times", etc. If the user doesn\'t specify, infer a reasonable value based on their goals and experience level.';

  const instructions = `You are Andy an AI Personal Trainer. You help users create workout programs and answer questions about fitness, exercise, and training.

You have access to tools that can help you:
- buildWorkoutProgram: Provides access to all available Hevy exercises (as a reference list with IDs and titles) and program parameters. Use this when users want to create workout programs.
${hevyProgram && hevyProgram.length > 0 ? '- getCurrentProgram: Returns the current workout program state. ALWAYS call this first to check if a program already exists before creating a new one.' : ''}

IMPORTANT: ${hevyProgram && hevyProgram.length > 0
  ? 'A workout program already exists. When users request changes, modifications, or ask about the program, use getCurrentProgram to see the current state, then modify it accordingly. Return the UPDATED program in the same format.'
  : 'No program currently exists. Create a new program when users request one.'}
${paramsContext}

When users ask about creating or modifying workouts or programs:
1. ${hevyProgram && hevyProgram.length > 0 ? 'First, call getCurrentProgram to see the current program state.' : ''}
2. Call the buildWorkoutProgram tool with their requirements${daysPerWeek !== undefined && daysPerWeek !== null ? `, making sure to pass daysPerWeek: ${daysPerWeek}` : ''}
3. The tool will return a reference list of available exercises in the format "id: title". Use the exercise IDs from this list to select appropriate exercises for the workout program.
4. Return the program as a JSON object with the structure: { program: TTextToJsonResponse }
5. TProgramResponse format:

{
program: {
        program_length_weeks: number;
        weeks: {
            week_number: number;
            week_title?: string;
            notes?: string;
            workout_days: {
                day_number: number; // 1-7 for day of week
                day_title: string;
                notes?: string;
                exercises: {
                    exercise_template_id: string;
                    title: string;
                    supersets_id: number | null;
                    notes?: string;
                    sets: {
                        type: "normal" | "warmup" | "dropset" | "failure";
                        reps: number;
                        rpe: number;
                        weight_percentage?: number; // % of 1RM for periodization
                        rest_seconds?: number;
                        tempo?: string; // e.g., "3-1-1-0"
                    }[];

                }[]
            }[]
        }[]
    }
}

6. CRITICAL: The exercise_template_id MUST be an exact match to an id from the exercise reference list returned by the tool (format: "id: title"). Do NOT invent exercises or use IDs that don't exist in that list.
7. IMPORTANT: Return ONLY the minimal data structure above. Do NOT include full exercise objects or other metadata. The exercise reference list you receive contains only IDs and titles - use those IDs directly as exercise_template_id values.
8. Generate workout_days based on the daysPerWeek parameter${daysPerWeek !== undefined && daysPerWeek !== null ? ` (${daysPerWeek} days = ${daysPerWeek} workout_days)` : ' (1 day = 1 workout_day, 3 days = 3 workout_days, etc.)'}. ${daysPerWeek !== undefined && daysPerWeek !== null ? `You MUST create exactly ${daysPerWeek} workout_days.` : 'Extract the number of days from the user\'s message if not provided.'}
9. The UI will use the exercise_template_id values directly to build the full program structure
${hevyProgram && hevyProgram.length > 0 ? '10. When modifying an existing program, preserve the structure and only change what the user requests. Return the complete updated program.' : ''}

Be conversational, helpful, and provide clear explanations about the workouts you create.`;

  return new ToolLoopAgent({
    model: gateway('anthropic/claude-sonnet-4.5'),
    instructions,
    tools: tools,
  });
}

export async function POST(req: Request) {
  try {
    const { messages, hevyProgram, daysPerWeek, programLength, excludeAreas, excludeEquipment, healthIssues } = await req.json();

    // Create agent with current program context and parameters
    const agent = createAgentWithProgram(hevyProgram, daysPerWeek, programLength, excludeAreas, excludeEquipment, healthIssues);

    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
    });
  } catch (error) {
    console.error('Error in chat API route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

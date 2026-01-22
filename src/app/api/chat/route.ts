import { ToolLoopAgent, createAgentUIStreamResponse, gateway, tool } from 'ai';
import { z } from 'zod';
import { getHevyExercises } from '@/components/program-builder/api/hevy';


import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();

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
4. CRITICAL: You MUST return workout programs using the following EXACT minified pipe-delimited format. This format reduces token usage while maintaining accuracy:

   **OUTPUT FORMAT - Use this EXACT schema:**

   **Routine (R) line:**
   R | folder_id | order | title | notes

   **Exercise (E) line:**
   E | exercise_template_id | index | notes | rest_seconds | supersets_id

   **Set (S) line:**
   S | index | type | weight_kg | reps | distance_meters | duration_seconds | rpe | custom_metric

   **End of Program token:**
   ;

   **Format Rules:**
   - || (two pipes with nothing between) = empty string
   - |null| (pipes with the word "null" between) = null value
   - Routines are always built in this order with no omitted fields - position in the pipe-delimited line infers the field
   - Exercises come after a newline following the Routine line
   - Sets come after a newline following the Exercise line
   - Multiple E lines can follow one R line (one exercise per line)
   - Multiple S lines can follow one E line (one set per line)
   - A semicolon (;) on its own line indicates the program generation is complete - you MUST output this when finished

   **Field Requirements:**
   - folder_id: Must be the week number (0-indexed). Week 1 = 0, Week 2 = 1, etc.
   - order: Must be the day of week (1-indexed as string). First day = "1", second day = "2", etc.
   - exercise_template_id: MUST be an exact match to an id from the exercise reference list returned by the tool. Do NOT invent exercises or use IDs that don't exist in that list.
   - title: Use a descriptive name (e.g., "Push Day", "Pull Day", "Leg Day")
   - index: 0-indexed position within the routine (for exercises) or within the exercise (for sets)
   - type: Set type - one of 'normal', 'warmup', 'dropset', 'failure'
   - For numeric fields (weight_kg, reps, etc.): Use the actual number or use |null| for null (|| will also be treated as null for numbers)
   - For string fields (notes, title, etc.): Use the actual text, || for empty string, or |null| for null

   **Example:**
   R|0|1|Push Day|Focus on chest and triceps
   E|ex_123|0||90|null
   S|0|normal|80|10|null|null|8|null
   S|1|normal|80|10|null|null|8|null
   S|2|normal|80|8|null|null|9|null
   E|ex_456|1||60|null
   S|0|normal|50|12|null|null|7|null
   S|1|normal|50|12|null|null|7|null
   ;

5. Generate routines based on the daysPerWeek and programLength parameters using the pipe-delimited format:
   - Create workout routines for each day of each week
   - ${daysPerWeek !== undefined && daysPerWeek !== null ? `You MUST create exactly ${daysPerWeek} routines per week.` : 'Extract the number of days from the user\'s message if not provided.'}
   - ${programLength !== undefined && programLength !== null ? `You MUST create routines for ALL ${programLength} weeks total. This means you need to generate ${programLength * (daysPerWeek || 1)} total routines (${programLength} weeks × ${daysPerWeek || 1} days per week). DO NOT stop after generating only 1-2 weeks. Generate the COMPLETE program with all ${programLength} weeks.` : 'Extract the program length from the user\'s message if not provided.'}
   - For each week, set folder_id to (week_number - 1) to make it 0-indexed
   - For each day within a week, set order to the day number as a string (1-indexed: "1", "2", "3", etc.)
   - CRITICAL: You must generate ALL weeks requested. If programLength is ${programLength !== undefined && programLength !== null ? programLength : 'X'}, you must create routines for weeks 0 through ${programLength !== undefined && programLength !== null ? programLength - 1 : 'X-1'} (${programLength !== undefined && programLength !== null ? programLength : 'X'} total weeks). Do not stop early or generate a partial program.
   - Output each routine using the R | E | S format specified above
   - After generating the complete program, output a semicolon (;) on its own line to signal completion

6. The parser will use the exercise_template_id values directly to build the full program structure
${hevyProgram && hevyProgram.length > 0 ? '7. When modifying an existing program, preserve the structure and only change what the user requests. Return the complete updated program in the same pipe-delimited format.\n\n' : ''}${hevyProgram && hevyProgram.length > 0 ? '8' : '7'}. COMPLETENESS REQUIREMENT: Before outputting the semicolon (;), verify that you have generated the complete program:
    - Count the total number of routines (R lines) in your program
    - ${programLength !== undefined && programLength !== null && daysPerWeek !== undefined && daysPerWeek !== null ? `Expected total: ${programLength * daysPerWeek} routines (${programLength} weeks × ${daysPerWeek} days)` : 'Match the expected total based on programLength × daysPerWeek'}
    - Verify that folder_id values cover all weeks from 0 to (programLength - 1)
    - Ensure each routine has at least one exercise (E line) and each exercise has at least one set (S line)
    - If the program is incomplete, continue generating until it is complete
    - DO NOT say "the remaining weeks follow the same structure" - actually generate all weeks using the R | E | S format
    - Only output the semicolon (;) when the ENTIRE program is complete

${hevyProgram && hevyProgram.length > 0 ? '9' : '8'}. Once you have completed generating the program and output the semicolon (;), summarize the actions you took in bullet points with explanations. Limit this to 10 Max bullet points.
Be conversational, helpful, and provide clear explanations about the workouts you create. DO NOT answer questions unrelated to fitness.`;

  return new ToolLoopAgent({
    model: gateway('anthropic/claude-sonnet-4.5'),
    instructions,
    tools: tools,
    experimental_telemetry: { isEnabled: true },
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

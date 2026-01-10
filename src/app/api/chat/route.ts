import { ToolLoopAgent, createAgentUIStreamResponse, gateway, tool } from 'ai';
import { z } from 'zod';
import { getHevyExercises } from '@/components/program-builder/api/hevy';

// Define the helloWorldTool
const helloWorldTool = tool({
  description: 'Returns a greeting message',
  inputSchema: z.object({}),
  execute: async () => {
    return 'Hello World';
  },
});

// Define the buildWorkoutProgram tool
const buildWorkoutProgramTool = tool({
  description: 'Provides access to all available Hevy exercises for building workout programs. Use this tool when users request workout programs. The tool returns the exercise list - you should then return a minimal workout structure (TTextToJsonResponse format) with just exercise titles, sets, reps, and RPE.',
  inputSchema: z.object({
    userRequest: z.string().describe('The user\'s workout request or description'),
    daysPerWeek: z.number().optional().describe('Number of workout days per week (1-7)'),
    programLength: z.number().optional().describe('Program length in weeks (defaults to 12)'),
    excludeAreas: z.string().optional().describe('Comma-separated list of muscle groups to exclude'),
    excludeEquipment: z.string().optional().describe('Comma-separated list of equipment to exclude'),
    healthIssues: z.string().optional().describe('Comma-separated list of health issues to consider'),
  }),
  execute: async ({ userRequest, daysPerWeek, programLength, excludeAreas, excludeEquipment, healthIssues }) => {
    try {
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

      // Return exercise list for AI context - AI must use exercise IDs from this list
      // The AI should return exercise_template_id values that match IDs from this list
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
          daysPerWeek: daysPerWeek || 3,
          programLength: programLength || 12,
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
});

// Export tools object
export const tools = {
  helloWorld: helloWorldTool,
  buildWorkoutProgram: buildWorkoutProgramTool,
};

// Create the agent instance with Claude via Vercel AI Gateway
const agent = new ToolLoopAgent({
  model: gateway('anthropic/claude-sonnet-4.5'),
  instructions: `You are Andy an AI Personal Trainer. You help users create workout programs and answer questions about fitness, exercise, and training.

You have access to tools that can help you:
- helloWorld: Returns a greeting message
- buildWorkoutProgram: Provides access to all available Hevy exercises and program parameters. Use this when users want to create workout programs.

When users ask about creating workouts or programs:
1. Call the buildWorkoutProgram tool with their requirements
2. Use the availableExercises list from the tool result to select appropriate exercises
3. Return the program as a JSON object with the structure: { program: TTextToJsonResponse }
4. TTextToJsonResponse format:
   {
     "program": {
       "workout_days": [
         {
           "day_title": "string",
           "exercises": [
             {
               "exercise_template_id": "string (MUST be an id from availableExercises array)",
               "title": "string (exercise name for reference, should match the title from availableExercises)",
               "supersets_id": number | null,
               "sets": [
                 {
                   "type": "normal" | "warmup" | "dropset" | "failure",
                   "reps": number,
                   "rpe": number (1-10)
                 }
               ]
             }
           ]
         }
       ]
     }
   }
5. CRITICAL: The exercise_template_id MUST be an exact match to an id from the availableExercises array returned by the tool. Do NOT invent exercises or use IDs that don't exist in that list.
6. IMPORTANT: Return ONLY the minimal data structure above. Do NOT include full exercise objects or other metadata.
7. Generate workout_days based on the daysPerWeek parameter (1 day = 1 workout_day, 3 days = 3 workout_days, etc.)
8. The UI will use the exercise_template_id values directly to build the full program structure

Be conversational, helpful, and provide clear explanations about the workouts you create.`,
  tools: tools,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log("messages in POST", messages);

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

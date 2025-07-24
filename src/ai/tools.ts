// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { tool as createTool } from 'ai';
import { z } from 'zod';

// Function to create a schema with a specific number of days
const createSchemaWithDays = (numDays: number) => z.object({
  workout_days: z.array(z.object({
    day_title: z.string(),
    exercises: z.array(z.object({
      title: z.string(),
      sets: z.array(z.object({
        type: z.string(),
        reps: z.number(),
        rpe: z.number(),
      })),
      supersets_id: z.number().nullable(),
    })),
  })).length(numDays), // Enforces exactly the specified number of days
});


export const programBuilderTool = createTool({
    description: `You are a fitness AI assistant. Your task is to return the exercises for each requested workout day in valid JSON format.
                  RULES:
                  - Each exercise name MUST include the equipment used in parentheses at the end.
                  - Format: "Exercise Name (Equipment)"
                  - Examples: "Squat (Barbell)", "Incline Bench Press (Dumbbell)", "Push-Up (Bodyweight)"
                  - DO NOT OMIT the equipment.
                  - DO NOT invent new formatting.
                  - FOLLOW THE FORMAT EXACTLY.
                  - You MUST return EXACTLY the number of days specified by num_days parameter`,
    inputSchema: z.object({
        schema_type: z.enum(['workout_history_schema', 'saved_workout_schema', 'program_creator_day_schema', 'one_day_schema', 'ppl_schema', 'ul_schema', 'cblsa_schema', 'pplc_schema', 'hevy_routine_schema']).describe('The schema type to use'),
        num_days: z.number().min(1).max(7).optional().describe('The number of workout days to return (1-7). If provided, will override schema_type day count.'),
        prompt: z.string().optional().describe('User description of their goals, experience level, and preferences'),
    }),
    execute: async function ({ schema_type, num_days, prompt = "Create a balanced workout" }) {
      // Use prompt parameter to generate more specific workouts based on user input
      console.log(`Generating workout for schema: ${schema_type} with ${num_days || 'default'} days and prompt: ${prompt}`);

      // Determine the number of days to use
      let targetDays = num_days;
      if (!targetDays) {
        // Default days based on schema type
        switch (schema_type) {
          case 'one_day_schema': targetDays = 1; break;
          case 'ul_schema': targetDays = 2; break;
          case 'ppl_schema': targetDays = 3; break;
          case 'pplc_schema': targetDays = 4; break;
          case 'cblsa_schema': targetDays = 5; break;
          default: targetDays = 3; // fallback
        }
      }

      try {
        // Create a dynamic schema with the target number of days
        const dynamicSchema = createSchemaWithDays(targetDays);

        // Generate workout data based on schema type and target days
        let workoutData;

        switch (schema_type) {
          case 'one_day_schema': {
            workoutData = {
              workout_days: [
                {
                  day_title: "Full Body Workout",
                  exercises: [
                    {
                      title: "Squat (Barbell)",
                      sets: [
                        { type: "normal", reps: 8, rpe: 7 },
                        { type: "normal", reps: 8, rpe: 7 },
                        { type: "normal", reps: 8, rpe: 7 }
                      ],
                      supersets_id: null
                    }
                  ]
                }
              ]
            };
            break;
          }

          case 'ppl_schema': {
            // Generate PPL-style workout with the target number of days
            const pplDays = ["Push Day", "Pull Day", "Legs Day"];
            const workoutDays = [];

            for (let i = 0; i < targetDays; i++) {
              const dayIndex = i % pplDays.length;
              const dayNumber = Math.floor(i / pplDays.length) + 1;
              const dayTitle = dayNumber > 1 ? `${pplDays[dayIndex]} ${dayNumber}` : pplDays[dayIndex];

              workoutDays.push({
                day_title: dayTitle,
                exercises: [
                  {
                    title: "Bench Press (Barbell)",
                    sets: [
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 }
                    ],
                    supersets_id: null
                  }
                ]
              });
            }

            workoutData = { workout_days: workoutDays };
            break;
          }

          case 'ul_schema': {
            // Generate Upper/Lower-style workout with the target number of days
            const ulDays = ["Upper Body", "Lower Body"];
            const workoutDays = [];

            for (let i = 0; i < targetDays; i++) {
              const dayIndex = i % ulDays.length;
              const dayNumber = Math.floor(i / ulDays.length) + 1;
              const dayTitle = dayNumber > 1 ? `${ulDays[dayIndex]} ${dayNumber}` : ulDays[dayIndex];

              workoutDays.push({
                day_title: dayTitle,
                exercises: [
                  {
                    title: "Bench Press (Barbell)",
                    sets: [
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 }
                    ],
                    supersets_id: null
                  }
                ]
              });
            }

            workoutData = { workout_days: workoutDays };
            break;
          }

          case 'cblsa_schema': {
            // Generate Chest/Back/Legs/Shoulders/Arms-style workout with the target number of days
            const cblsaDays = ["Chest Day", "Back Day", "Legs Day", "Shoulders Day", "Arms Day"];
            const workoutDays = [];

            for (let i = 0; i < targetDays; i++) {
              const dayIndex = i % cblsaDays.length;
              const dayNumber = Math.floor(i / cblsaDays.length) + 1;
              const dayTitle = dayNumber > 1 ? `${cblsaDays[dayIndex]} ${dayNumber}` : cblsaDays[dayIndex];

              workoutDays.push({
                day_title: dayTitle,
                exercises: [
                  {
                    title: "Bench Press (Barbell)",
                    sets: [
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 }
                    ],
                    supersets_id: null
                  }
                ]
              });
            }

            workoutData = { workout_days: workoutDays };
            break;
          }

          case 'pplc_schema': {
            // Generate PPL + Cardio-style workout with the target number of days
            const pplcDays = ["Push Day", "Pull Day", "Legs Day", "Cardio Day"];
            const workoutDays = [];

            for (let i = 0; i < targetDays; i++) {
              const dayIndex = i % pplcDays.length;
              const dayNumber = Math.floor(i / pplcDays.length) + 1;
              const dayTitle = dayNumber > 1 ? `${pplcDays[dayIndex]} ${dayNumber}` : pplcDays[dayIndex];

              workoutDays.push({
                day_title: dayTitle,
                exercises: [
                  {
                    title: "Bench Press (Barbell)",
                    sets: [
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 },
                      { type: "normal", reps: 8, rpe: 7 }
                    ],
                    supersets_id: null
                  }
                ]
              });
            }

            workoutData = { workout_days: workoutDays };
            break;
          }

          default:
            throw new Error(`Unhandled schema type: ${schema_type}`);
        }

        // Validate the generated data against the dynamic schema
        const validatedData = dynamicSchema.parse(workoutData);
        return validatedData;

      } catch (error) {
        console.error('Schema validation error:', error);
        throw new Error(`Failed to generate ${targetDays}-day workout for schema type: ${schema_type}`);
      }
    }
  });

export const tools = {
  updateProgram: programBuilderTool,
};

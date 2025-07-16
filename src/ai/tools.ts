import { tool as createTool } from 'ai';
import { z } from 'zod';

export const weatherTool = createTool({
  description: 'Display the weather for a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async function ({ location }) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { weather: 'Sunny', temperature: 75, location };
  },
});

// export const programBuilderTool = createTool({
//     description: 'Builds workout programs based on schema_type and user program input',
//     inputSchema,
//     execute: async function ({ schema_type, program }) {
//       switch (schema_type) {
//         case 'workout_history_schema':
//           return {
//             instructions: "You are a fitness app AI assistant. Your task is to create a JSON structure for workout history (workout_history_schema)...",
//             output: {} // TODO: Replace with actual logic
//           };

//         case 'saved_workout_schema':
//           return {
//             instructions: "Create a new workout... ONLY fill in the 'reps' and 'rpe' fields...",
//             output: {}
//           };

//         case 'program_creator_day_schema':
//           return {
//             instructions: "Create a workout following the program_creator_day_schema...",
//             output: {}
//           };

//         case 'one_day_schema':
//         case 'ppl_schema':
//         case 'ul_schema':
//         case 'cblsa_schema':
//         case 'pplc_schema':
//           return {
//             instructions: `You are a fitness AI assistant. Your task is to return the exercises...`,
//             output: {}
//           };

//         case 'hevy_routine_schema':
//           return {
//             instructions: "Create the specified workout day following the hevy_routine_schema...",
//             output: {}
//           };

//         default:
//           throw new Error(`Unhandled schema type: ${schema_type}`);
//       }
//     }
//   });


export const tools = {
  displayWeather: weatherTool,
};

// switch (schema_type) {
//     case "workout_history_schema":
//         return "You are a fitness app AI assistant. Your task is to create a JSON structure for workout history (workout_history_schema), generate new workouts (saved_workout_schema), and design programs (program_details_schema). Follow the JSON format strictly.";
//     case "saved_workout_schema":
//         return "Create a new workout using the data provided. For each exercise, ONLY fill in the 'reps' and 'rpe' fields. Leave all other fields as null. MAKE SURE TO USE ONLY THE EXERCISES LISTED IN THE PROMPT.";
//     case "program_creator_day_schema":
//         return "Create a workout following the program_creator_day_schema based on the user's request. Format the output as valid JSON.";
//     case "one_day_schema":
//     case "ppl_schema":
//     case "ul_schema":
//     case "cblsa_schema":
//     case "pplc_schema":
//         return `You are a fitness AI assistant. Your task is to return the exercises for each requested workout day in valid JSON format.
//                   RULES:
//                   - Each exercise name MUST include the equipment used in parentheses at the end.
//                   - Format: "Exercise Name (Equipment)"
//                   - Examples: "Squat (Barbell)", "Incline Bench Press (Dumbbell)", "Push-Up (Bodyweight)"
//                   - DO NOT OMIT the equipment.
//                   - DO NOT invent new formatting.
//                   - FOLLOW THE FORMAT EXACTLY.`;
//     case "hevy_routine_schema":
//         return "Create the specified workout day following the hevy_routine_schema. Ensure the output is valid JSON and respects the schema structure.";
//     default:
//         throw new Error(`Unhandled schema type: ${schema_type}`);,

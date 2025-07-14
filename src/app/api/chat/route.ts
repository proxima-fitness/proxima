import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { ExampleMetadata } from "./example-metadata-schema";
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const startTime = Date.now();
  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are a fitness AI assistant. Your task is to return the exercises for each requested workout day in valid JSON format.
                    RULES:
                    - Each exercise name MUST include the equipment used in parentheses after the exercise name.
                    - Format: "Exercise Name (Equipment)"
                    - Examples: "Squat (Barbell)", "Incline Bench Press (Dumbbell)", "Push-Up (Bodyweight)"
                    - DO NOT OMIT the equipment.
                    - DO NOT invent new formatting.
                    - FOLLOW THE FORMAT EXACTLY.`,
    prompt: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }): ExampleMetadata | undefined => {
      // send custom information to the client on start:
      if (part.type === 'start') {
        return {
          model: 'gpt-4o', // initial model id
        };
      }

      // send additional model information on finish-step:
      if (part.type === 'finish-step') {
        return {
          model: part.response.modelId, // update with the actual model id
          duration: Date.now() - startTime,
        };
      }

      // when the message is finished, send additional information:
      if (part.type === 'finish') {
        return {
          totalTokens: part.totalUsage.totalTokens,
        };
      }
    },
  });
}

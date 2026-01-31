import { ToolLoopAgent, createAgentUIStreamResponse, gateway, stepCountIs } from 'ai';

// Vercel serverless function timeout - 2 minutes for workout generation
// This is important for longer programs that may take time to generate
export const maxDuration = 120;
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { instructions } from './instructions/instructions';
import { getTools } from './tools/tools';

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();


/**
 * POST request handler for the chat API route
 * @param req { messages: Message[], hevyProgram: THevyRoutine[], daysPerWeek: number, programLength: number, excludeAreas: string, excludeEquipment: string, healthIssues: string }
 *
 * @returns { Response }
 */
export async function POST(req: Request) {

    try {
        const { messages, hevyProgram = [], daysPerWeek, programLength, excludeAreas = "", excludeEquipment = "", healthIssues = "" } = await req.json();

        const systemPrompt = instructions({ hevyProgram, daysPerWeek, programLength });
        const tools = getTools({ excludeAreas, excludeEquipment, healthIssues, hevyProgram });

        const andy = new ToolLoopAgent({
            model: gateway('moonshotai/kimi-k2'),
                //'anthropic/claude-sonnet-4.5'),
            instructions: systemPrompt,
            tools: tools,
            // Explicit step limit to prevent infinite loops
            // Typical flow: getMoreInfoQuestions (1) + getExerciseList (1) + buildRoutine x N (max 7 days)
            // = ~10 steps max, but allowing 25 for safety with retries
            stopWhen: stepCountIs(25),
            experimental_telemetry: { isEnabled: true },
          });

        return createAgentUIStreamResponse({
            agent: andy,
            uiMessages: messages,
        });

    } catch (error) {
        console.error('Error in chat API route:', error);
        return new Response(JSON.stringify(
            { error: 'Failed to process chat request' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

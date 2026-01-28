import { ToolLoopAgent, createAgentUIStreamResponse, gateway } from 'ai';
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
            model: gateway('anthropic/claude-sonnet-4.5'),
            instructions: systemPrompt,
            tools: tools,
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

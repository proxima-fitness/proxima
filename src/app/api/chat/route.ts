import { ToolLoopAgent, createAgentUIStreamResponse, gateway, tool } from 'ai';
import { z } from 'zod';

// Define the helloWorldTool
const helloWorldTool = tool({
  description: 'Returns a greeting message',
  inputSchema: z.object({}),
  execute: async () => {
    return 'Hello World';
  },
});

// Export tools object
export const tools = {
  helloWorld: helloWorldTool,
};

// Create the agent instance with Claude via Vercel AI Gateway
const agent = new ToolLoopAgent({
  model: gateway('anthropic/claude-sonnet-4.5'),
  instructions: `You are Andy an AI Personal Trainer. You help users create workout programs and answer questions about fitness, exercise, and training.

You have access to tools that can help you:
- helloWorld: Returns a greeting message

When users ask about creating workouts or programs, use the appropriate tools. Be conversational, helpful, and provide clear explanations about the workouts you create.`,
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

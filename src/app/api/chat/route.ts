/**
 * @module chat
 *
 * Streaming chat API route that powers "Andy", the AI personal trainer.
 * Receives conversation messages and program-builder context, then runs a
 * Vercel AI SDK ToolLoopAgent that can invoke tools (exercise lookup,
 * build routine, modify program, etc.) and streams incremental UI updates
 * back to the client.
 *
 * Observability is provided by Langfuse via OpenTelemetry.
 *
 * Depends on: ai (Vercel AI SDK), @langfuse/otel, ./instructions, ./tools
 * Used by: Chat.tsx (program-builder agent panel)
 */

import { ToolLoopAgent, createAgentUIStreamResponse, gateway, stepCountIs } from 'ai';

// Vercel serverless function timeout - 2 minutes for workout generation
// This is important for longer programs that may take time to generate
export const maxDuration = 120;
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { instructions } from './instructions/instructions';
import { getTools } from './tools/tools';
import { createSandbox } from './skills/sandbox';
import { discoverSkills } from './skills/index';
import z from 'zod';

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();

/**
 * Sanitizes the incoming UI message history by dropping a trailing assistant
 * message that contains unresolved tool calls (e.g. after an aborted stream).
 * This prevents AI_MissingToolResultsError when the next turn is started.
 */
export function sanitizeMessagesWithUnresolvedToolCalls(messages: unknown[]): unknown[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const last = messages[messages.length - 1] as {
    role?: string;
    parts?: Array<{ type?: string; state?: string }>;
  };

  if (last?.role !== 'assistant' || !Array.isArray(last.parts)) return messages;

  const hasUnresolvedToolCall = last.parts.some((part) => {
    if (!part || typeof part !== 'object') return false;
    const type = part.type;
    const state = part.state;
    if (typeof type !== 'string') return false;
    if (!type.startsWith('tool-')) return false;
    return state === 'input-streaming' || state === 'input-available';
  });

  if (!hasUnresolvedToolCall) return messages;

  return messages.slice(0, -1);
}

function buildSkillsPrompt(skills: ISkillMetadata[]): string {
    if (skills.length === 0) return '';

    const skillsList = skills
      .map(s => `- ${s.name}: ${s.description}`)
      .join('\n');

    return `
## Skills

Use the \`loadSkill\` tool when the user's request would benefit from specialized instructions. Choose the skill whose description best matches the request.

Available skills:
${skillsList}
`;
}

const callOptionsSchema = z.object({
    sandbox: z.custom<ISandbox>(),
    skills: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            path: z.string(),
            allowedTools: z.array(z.string()).optional(),
        }),
    ),
    activeToolScope: z.object({
        allowedTools: z.array(z.string()).nullable(),
    }),
});


/**
 * Handles a chat turn: builds the system prompt and tool set from the request
 * payload, runs the ToolLoopAgent, and returns a streaming UI response.
 *
 * @param req - Request whose JSON body contains `messages`, `hevyProgram`,
 *   `daysPerWeek`, `programLength`, and optional exclusion/health filters.
 * @returns A streaming `Response` that the Vercel AI SDK client consumes to
 *   render incremental agent output and tool invocations.
 */
export async function POST(req: Request) {

    try {
        const { messages, hevyProgram = [], daysPerWeek, programLength, excludeAreas = "", excludeEquipment = "", healthIssues = "" } = await req.json();

        const sanitizedMessages = sanitizeMessagesWithUnresolvedToolCalls(messages);

        const systemPrompt = instructions({ hevyProgram, daysPerWeek, programLength });
        const tools = getTools({ excludeAreas, excludeEquipment, healthIssues, hevyProgram });

        const sandbox = createSandbox({ workingDirectory: process.cwd() });
        const skills = await discoverSkills(sandbox, ['.agents/skills']);
        const activeToolScope: { allowedTools: string[] | null } = { allowedTools: null };

        const andy = new ToolLoopAgent({
            model: gateway(
                'google/gemini-3-flash'),
                // 'anthropic/claude-sonnet-4.5'
            instructions: systemPrompt,
            tools: tools,
            callOptionsSchema: callOptionsSchema,
            stopWhen: stepCountIs(15),
            experimental_telemetry: { isEnabled: true },
            prepareCall: ({ options, ...settings }) => {
                const CORE_TOOLS = ['loadSkill', 'readFile', 'bash'];
                let filteredTools = settings.tools;
                if (options.activeToolScope.allowedTools?.length) {
                    const allowed = new Set([
                        ...options.activeToolScope.allowedTools,
                        ...CORE_TOOLS,
                    ]);
                    filteredTools = Object.fromEntries(
                        Object.entries(settings.tools as Record<string, unknown>).filter(
                            ([name]) => allowed.has(name)
                        )
                    ) as typeof settings.tools;
                }
                return {
                    ...settings,
                    tools: filteredTools,
                    instructions: `${settings.instructions}\n\n${buildSkillsPrompt(options.skills)}`,
                    experimental_context: {
                        sandbox: options.sandbox,
                        skills: options.skills,
                        activeToolScope: options.activeToolScope,
                    },
                };
            },

            // providerOptions: {
            //     google: {
            //         thinkingConfig: {
            //             thinkingLevel: 'low',
            //             includeThoughts: true,
            //         },
            //     },
            // },
          });

        return createAgentUIStreamResponse({
            agent: andy,
            uiMessages: sanitizedMessages,
            options: { sandbox, skills, activeToolScope },
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

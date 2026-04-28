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
 * Depends on: ai (Vercel AI SDK), @langfuse/tracing, ./instructions, ./tools
 * Used by: Chat.tsx (program-builder agent panel)
 */

import { ToolLoopAgent, createAgentUIStreamResponse, gateway, stepCountIs } from 'ai';
import { after } from 'next/server';
import { observe, propagateAttributes } from '@langfuse/tracing';
import { langfuseSpanProcessor } from '../../../../instrumentation';
import { createClient } from '@/utils/supabase/server';
import { instructions } from './instructions/instructions';
import { getTools, type IBuildWeekOnceGuard } from './tools/tools';
import { createSandbox } from './skills/sandbox';
import { discoverSkills } from './skills/index';
import z from 'zod';
import { sanitizeMessagesWithUnresolvedToolCalls } from './sanitize-messages';

// Vercel serverless function timeout - 2 minutes for workout generation
// This is important for longer programs that may take time to generate
export const maxDuration = 120;

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
 *   `daysPerWeek`, `programLength`, optional exclusion/health filters, and optional
 *   questionnaire fields (`excludeEquipment`, `splitType`, `exerciseVariability`, `progressionSystem`, `deloadWeek`, `peakWeek`).
 * @returns A streaming `Response` that the Vercel AI SDK client consumes to
 *   render incremental agent output and tool invocations.
 */
async function handleChatPost(req: Request) {
    try {
        const {
            messages,
            hevyProgram = [],
            daysPerWeek,
            programLength,
            excludeAreas = "",
            excludeEquipment = "",
            healthIssues = "",
            splitType = "",
            exerciseVariability = "",
            progressionSystem = "",
            deloadWeek = "",
            peakWeek = "",
            chatSessionId,
        } = await req.json();

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user?.id?.slice(0, 200) || undefined;
        const sessionId = typeof chatSessionId === 'string' && chatSessionId.trim()
            ? chatSessionId.trim().slice(0, 200)
            : undefined;

        return propagateAttributes(
            { userId, sessionId, traceName: 'andy-chat', metadata: { source: 'build-program' } },
            async () => {
                const sanitizedMessages = sanitizeMessagesWithUnresolvedToolCalls(messages);

                const systemPrompt = instructions({
                    hevyProgram,
                    daysPerWeek,
                    programLength,
                    healthIssues,
                    excludeEquipment,
                    splitType,
                    exerciseVariability,
                    progressionSystem,
                    deloadWeek,
                    peakWeek,
                });
                const buildWeekOnceGuard: IBuildWeekOnceGuard = { locked: false };
                const tools = getTools({
                    excludeAreas,
                    excludeEquipment,
                    healthIssues,
                    hevyProgram,
                    buildWeekOnceGuard,
                });

                const sandbox = createSandbox({ workingDirectory: process.cwd() });
                const skills = await discoverSkills(sandbox, ['.agents/skills']);
                const activeToolScope: { allowedTools: string[] | null } = { allowedTools: null };

                const andy = new ToolLoopAgent({
                    model: gateway(
                        'google/gemini-3.1-flash-lite-preview',
                        // 'google/gemini-3-flash'
                    ),
                        // 'anthropic/claude-sonnet-4.5'
                    instructions: systemPrompt,
                    tools: tools,
                    callOptionsSchema: callOptionsSchema,
                    stopWhen: stepCountIs(28),
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

                    providerOptions: {
                        google: {
                            thinkingConfig: {
                                thinkingLevel: 'low',
                                includeThoughts: true,
                            },
                        },
                    },
                });

                after(async () => {
                    try {
                        await langfuseSpanProcessor.forceFlush();
                    } catch (err) {
                        console.error('[langfuse] forceFlush failed:', err);
                    }
                });

                return createAgentUIStreamResponse({
                    agent: andy,
                    uiMessages: sanitizedMessages,
                    options: { sandbox, skills, activeToolScope },
                });
            }
        );

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

export const POST = observe(handleChatPost, {
    name: 'andy-chat',
    endOnExit: false,
});

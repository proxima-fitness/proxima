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

import { ToolLoopAgent, createAgentUIStreamResponse, gateway, isStepCount } from 'ai';
import { after } from 'next/server';
import { observe, propagateAttributes } from '@langfuse/tracing';
import { langfuseSpanProcessor } from '../../../../instrumentation';
import { createClient } from '@/utils/supabase/server';
import {
    tryConsumeMonthlyLlmRequest,
    usageCapResponse,
} from '@/lib/server-feature-limits';
import { instructions } from './instructions/instructions';
import { getTools, type IBuildWeekOnceGuard } from './tools/tools';
import { initializeConstraintProfile } from './constraints';
import { mergeConstraintProfiles } from './constraints/merge';
import { getUserConstraints } from '@/api/user-constraints';
import {
    initializeTrainingProfile,
    mergeTrainingProfiles,
} from './training-profile';
import { getUserTrainingProfile } from '@/api/user-training-profile';
import { getLatestBodyMeasurement } from '@/api/body-measurements-read';
import { getRecentEpisodes } from '@/api/session-episodes';
import { createSandbox } from './skills/sandbox';
import { discoverSkills } from './skills/index';
import z from 'zod';
import { sanitizeMessagesWithUnresolvedToolCalls } from './sanitize-messages';
import { ALWAYS_AVAILABLE_CHAT_TOOLS } from './always-available-tools';
import { streamAgentOnError } from './stream-on-error';

// Vercel serverless function timeout - 2 minutes for workout generation
// This is important for longer programs that may take time to generate
export const maxDuration = 120;

/** Presence-only vault check - never returns the Hevy API key string. */
async function hasHevyApiKey(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
): Promise<boolean> {
    const { data, error } = await supabase.rpc('read_secret', {
        secret_name: `hevy_api_key_${userId}`,
    });
    if (error || data == null) return false;
    return typeof data === 'string' ? data.trim().length > 0 : Boolean(data);
}

/**
 * Client IP for the **Hevy share fetch** throttle - anonymous callers have no user id,
 * so the proxy headers are the only handle. First hop in `x-forwarded-for` is the client.
 */
function readClientIp(req: Request): string | undefined {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded.slice(0, 100);
    return req.headers.get('x-real-ip')?.trim().slice(0, 100) || undefined;
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
 *   `daysPerWeek`, `programLength`, optional exclusion/health filters, optional
 *   questionnaire fields (`excludeEquipment`, `splitType`, `exerciseVariability`, `progressionSystem`, `deloadWeek`, `peakWeek`, `warmupExercises`),
 *   optional Training profile seed (`age`, `sex`, `heightCm`, `experienceLevel`, `physiquePhase`, `trainingFocus`, `activityLevel`, `sessionDurationMin`),
 *   `isInLbs` (user weight display preference; defaults true), and `programHasExercises`
 *   (grid-state flag sent every turn even when the `hevyProgram` snapshot is omitted).
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
            warmupExercises = "",
            age,
            sex,
            heightCm,
            experienceLevel,
            physiquePhase,
            trainingFocus,
            activityLevel,
            sessionDurationMin,
            chatSessionId,
            isInLbs = true,
            programHasExercises,
        } = await req.json();

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Authenticated LLM meter: consume before any model/stream work (ADR 0019).
        // Paywall: 402 + { error: "usage_cap", feature: "monthly_llm_requests", resets_on? }.
        // Anonymous: no RPC; client localStorage remains the only meter.
        let hasActiveSubscription = false;
        if (user) {
            const consume = await tryConsumeMonthlyLlmRequest(supabase, user);
            if (!consume.ok) {
                if (consume.reason === 'usage_cap') {
                    return usageCapResponse({ resets_on: consume.resets_on });
                }
                console.error('try_consume_feature_usage failed:', consume.error);
                return new Response(
                    JSON.stringify({ error: 'Failed to process chat request' }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    },
                );
            }
            hasActiveSubscription = Boolean(consume.limits?.has_active_subscription);
        }

        const userId = user?.id?.slice(0, 200) || undefined;
        const sessionId = typeof chatSessionId === 'string' && chatSessionId.trim()
            ? chatSessionId.trim().slice(0, 200)
            : undefined;
        const weightInLbs = isInLbs !== false;
        const clientIp = readClientIp(req);

        return propagateAttributes(
            { userId, sessionId, traceName: 'andy-chat', metadata: { source: 'build-program' } },
            async () => {
                const sanitizedMessages = sanitizeMessagesWithUnresolvedToolCalls(messages);

                const [persistedConstraints, persistedTrainingProfile, latestBodyMeasurement, hevyKeyOnFile] = user
                    ? await Promise.all([
                        getUserConstraints(user.id, supabase),
                        getUserTrainingProfile(user.id, supabase),
                        getLatestBodyMeasurement(supabase, user.id),
                        hasHevyApiKey(supabase, user.id),
                    ])
                    : [null, null, null, false];

                const constraintProfile = mergeConstraintProfiles(
                    persistedConstraints,
                    initializeConstraintProfile({
                        healthIssues,
                        excludeEquipment,
                        excludeAreas,
                        splitType,
                        exerciseVariability,
                        progressionSystem,
                        deloadWeek,
                        peakWeek,
                        warmupExercises,
                    }),
                );

                const trainingProfile = mergeTrainingProfiles(
                    persistedTrainingProfile,
                    initializeTrainingProfile({
                        age,
                        sex,
                        heightCm,
                        experienceLevel,
                        physiquePhase,
                        trainingFocus,
                        activityLevel,
                        sessionDurationMin,
                    }),
                );

                // Fetch episodic memory when editing an existing program
                const episodes = (user && hevyProgram.length > 0)
                    ? await getRecentEpisodes(supabase, user.id)
                    : [];

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
                    warmupExercises,
                    hasWorkoutHistoryAccess: hasActiveSubscription,
                    hasBodyMeasurementsAccess: hasActiveSubscription,
                    constraintProfile,
                    trainingProfile,
                    latestBodyMeasurement,
                    episodes,
                    isInLbs: weightInLbs,
                    isAuthenticated: Boolean(user),
                    hasHevyApiKey: hevyKeyOnFile,
                });
                const buildWeekOnceGuard: IBuildWeekOnceGuard = { locked: false };
                const tools = getTools({
                    hevyProgram,
                    buildWeekOnceGuard,
                    hasActiveSubscription,
                    userId: user?.id,
                    workoutHistoryDb: user ? supabase : undefined,
                    constraintProfile,
                    trainingProfile,
                    isInLbs: weightInLbs,
                    clientIp,
                    programHasExercises:
                        typeof programHasExercises === 'boolean' ? programHasExercises : undefined,
                });

                const sandbox = createSandbox({ workingDirectory: process.cwd() });
                const skills = await discoverSkills(sandbox, ['.agents/skills']);
                const activeToolScope: { allowedTools: string[] | null } = { allowedTools: null };

                const skillToolsContext = {
                    loadSkill: {
                        sandbox,
                        skills,
                        activeToolScope,
                    },
                    readFile: {
                        sandbox,
                    },
                    bash: {
                        sandbox,
                    },
                };

                const andy = new ToolLoopAgent({
                    model: gateway(
                        'google/gemini-3.1-flash-lite',
                        // 'google/gemini-3-flash'
                    ),
                        // 'anthropic/claude-sonnet-4.5'
                    instructions: systemPrompt,
                    tools: tools,
                    toolsContext: skillToolsContext,
                    callOptionsSchema: callOptionsSchema,
                    stopWhen: isStepCount(28),
                    telemetry: { isEnabled: true },
                    prepareCall: ({ options, ...settings }) => {
                        let filteredTools = settings.tools;
                        if (options.activeToolScope.allowedTools?.length) {
                            const allowed = new Set([
                                ...options.activeToolScope.allowedTools,
                                ...ALWAYS_AVAILABLE_CHAT_TOOLS,
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
                            toolsContext: {
                                loadSkill: {
                                    sandbox: options.sandbox,
                                    skills: options.skills,
                                    activeToolScope: options.activeToolScope,
                                },
                                readFile: {
                                    sandbox: options.sandbox,
                                },
                                bash: {
                                    sandbox: options.sandbox,
                                },
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
                    // Safe class code to client; real error stays in server logs + Langfuse (ADR 03).
                    onError: streamAgentOnError,
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

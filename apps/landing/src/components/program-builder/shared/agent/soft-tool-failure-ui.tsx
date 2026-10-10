/**
 * @module soft-tool-failure-ui
 * Soft tool failure render: calm in-progress copy for ordinary users;
 * ToolErrorPanel only when Agent debug mode is on.
 * Always fires PostHog `ai_tool_error` (ADR 02) — UI hide ≠ metric hide.
 * Depends on: Tool / ToolErrorPanel, tool-error helpers, capture-ai-tool-error.
 * Used by: MessageBubbles soft-fail branches.
 */
"use client";

import { useEffect } from "react";
import type { ToolUIPart } from "ai";
import {
    Tool,
    ToolContent,
    ToolErrorPanel,
    ToolHeader,
    warningStatusOverride,
} from "@/components/ai-elements/tool";
import { isTestUser } from "@/api/feature-limits";
import { captureAiToolError } from "@/lib/capture-ai-tool-error";
import { useUserContext } from "@/contexts/UserContext";
import {
    buildToolErrorPayload,
    summarizeToolError,
    type TToolErrorContext,
} from "./tool-error";

/** Tools that surface Soft tool failure UI in chat. */
export type TSoftFailTool =
    | "buildProgram"
    | "mutateProgram"
    | "getWorkoutHistory"
    | "rateProgram"
    | "fetchHevyShareFolder"
    | "importHevyShareFolder";

type TSoftFailToolType = `tool-${TSoftFailTool}`;

type TCalmCopy = {
    /** Header title while looking busy (non-debug). */
    title: string;
    /** Static progress line — never raw error / Zod. */
    copy: string;
    toolType: TSoftFailToolType;
    /** Header title when debug panel is shown. */
    debugTitle: string;
};

/** Calm progress titles + copy per tool (ADR 01). */
export const SOFT_FAIL_CALM: Record<TSoftFailTool, TCalmCopy> = {
    buildProgram: {
        title: "Recalculating",
        copy: "Recalculating…",
        toolType: "tool-buildProgram",
        debugTitle: "Build program",
    },
    mutateProgram: {
        title: "Reading",
        copy: "Reading...",
        toolType: "tool-mutateProgram",
        debugTitle: "Mutate program",
    },
    getWorkoutHistory: {
        title: "Workout history",
        copy: "Loading history…",
        toolType: "tool-getWorkoutHistory",
        debugTitle: "Workout history",
    },
    rateProgram: {
        title: "Rate program",
        copy: "Scoring…",
        toolType: "tool-rateProgram",
        debugTitle: "Rate program",
    },
    fetchHevyShareFolder: {
        title: "Read Hevy share",
        copy: "Reading share…",
        toolType: "tool-fetchHevyShareFolder",
        debugTitle: "Read Hevy share",
    },
    importHevyShareFolder: {
        title: "Load Hevy share",
        copy: "Loading share…",
        toolType: "tool-importHevyShareFolder",
        debugTitle: "Load Hevy share",
    },
};

const TOOL_SHELL_CLASS = "mx-auto w-full max-w-3xl px-4 md:px-6 pt-2";

export type TSoftToolFailureProps = {
    tool: TSoftFailTool;
    debugMode: boolean;
    errorCtx: TToolErrorContext;
    getChatId: () => string;
    /** mutateProgram warning severity only; others stay error. */
    severity?: "error" | "warning";
    /** AI SDK toolCallId — dedupes PostHog capture across remounts. */
    toolCallId?: string;
};

/**
 * Soft fail UI: `input-available` + calm copy unless a test user has
 * Agent debug mode on; then ToolErrorPanel (+ optional warning chrome).
 * Caller must set React `key` on this element in lists.
 */
export function SoftToolFailure({
    tool,
    debugMode,
    errorCtx,
    getChatId,
    severity = "error",
    toolCallId,
}: TSoftToolFailureProps) {
    const { user } = useUserContext();
    const calm = SOFT_FAIL_CALM[tool];
    const showDebugPanel = debugMode && isTestUser(user);

    const toolType = calm.toolType as ToolUIPart["type"];

    useEffect(() => {
        captureAiToolError({
            tool,
            output: errorCtx.output,
            errorText: errorCtx.errorText,
            severity,
            chatSessionId: getChatId(),
            userId: user?.id,
            toolCallId,
        });
    }, [
        tool,
        errorCtx.output,
        errorCtx.errorText,
        severity,
        getChatId,
        user?.id,
        toolCallId,
    ]);

    if (!showDebugPanel) {
        return (
            <Tool defaultOpen className={TOOL_SHELL_CLASS}>
                <ToolHeader type={toolType} state="input-available" title={calm.title} />
                <ToolContent>
                    <p className="text-sm text-muted-foreground px-3 pb-3">{calm.copy}</p>
                </ToolContent>
            </Tool>
        );
    }

    const isWarning = severity === "warning";
    return (
        <Tool defaultOpen className={TOOL_SHELL_CLASS}>
            <ToolHeader
                type={toolType}
                state="output-error"
                title={calm.debugTitle}
                statusOverride={isWarning ? warningStatusOverride : undefined}
            />
            <ToolContent>
                <ToolErrorPanel
                    tool={tool}
                    errorCtx={errorCtx}
                    getChatId={getChatId}
                    summary={summarizeToolError(tool, errorCtx)}
                    copyPayload={buildToolErrorPayload(tool, errorCtx)}
                    severity={severity}
                />
            </ToolContent>
        </Tool>
    );
}

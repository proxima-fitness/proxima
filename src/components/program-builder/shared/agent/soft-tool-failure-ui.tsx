/**
 * @module soft-tool-failure-ui
 * Soft tool failure render: calm in-progress copy for ordinary users;
 * ToolErrorPanel only when Agent debug mode is on.
 * Depends on: Tool / ToolErrorPanel, tool-error helpers.
 * Used by: MessageBubbles soft-fail branches.
 */
"use client";

import type { ToolUIPart } from "ai";
import {
    Tool,
    ToolContent,
    ToolErrorPanel,
    ToolHeader,
    warningStatusOverride,
} from "@/components/ai-elements/tool";
import {
    buildToolErrorPayload,
    summarizeToolError,
    type TToolErrorContext,
} from "./tool-error";

/** Tools that surface Soft tool failure UI in chat. */
export type TSoftFailTool =
    | "buildWeek"
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
    buildWeek: {
        title: "Recalculating",
        copy: "Recalculating…",
        toolType: "tool-buildWeek",
        debugTitle: "Build week",
    },
    mutateProgram: {
        title: "Planning",
        copy: "Planning…",
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
};

/**
 * Soft fail UI: `input-available` + calm copy when debug off;
 * existing ToolErrorPanel (+ optional warning chrome) when debug on.
 * Caller must set React `key` on this element in lists.
 */
export function SoftToolFailure({
    tool,
    debugMode,
    errorCtx,
    getChatId,
    severity = "error",
}: TSoftToolFailureProps) {
    const calm = SOFT_FAIL_CALM[tool];

    const toolType = calm.toolType as ToolUIPart["type"];

    if (!debugMode) {
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

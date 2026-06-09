"use client";

/**
 * @module Tool
 *
 * UI primitives for displaying structured tool calls inside AI responses.
 * This module provides a collapsible container, status header, and helpers
 * for rendering tool input and output (including JSON payloads) using the
 * shared `CodeBlock` component.
 *
 * Depends on:
 * - `ToolUIPart` and `DynamicToolUIPart` from the `ai` SDK
 * - Design system `Collapsible` and `Badge` components
 * - The `CodeBlock` module for pretty-printing structured data
 *
 * Used by:
 * - `MessageBubbles` when rendering tool call traces beneath assistant
 *   messages
 * - Other debugging and introspection UIs that surface tool execution
 *   details inline with conversation history.
 */

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";

import {
  buildToolErrorPayload,
  summarizeToolError,
} from "@/components/program-builder/shared/agent/tool-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  CopyIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { isValidElement, useCallback } from "react";
import { toast } from "sonner";

import { CodeBlock } from "./code-block";

/**
 * Props for the root `Tool` container, which wraps a single tool call
 * in a bordered, collapsible panel.
 */
export type TToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: TToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type TToolPart = ToolUIPart | DynamicToolUIPart;

/**
 * Props for the tool header row.
 *
 * - For static tools, `type` and `state` come from `ToolUIPart`.
 * - For dynamic tools, `toolName` provides a human-friendly label.
 */
export type TToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<TToolPart["state"], string> = {
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Displaying",
  "output-denied": "Denied",
  "output-error": "Error",
};

const statusIcons: Record<TToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
  "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
  "input-available": <ClockIcon className="size-4 animate-pulse" />,
  "input-streaming": <CircleIcon className="size-4" />,
  "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  "output-error": <XCircleIcon className="size-4 text-red-600" />,
};

export const getStatusBadge = (status: TToolPart["state"]) => (
  <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: TToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title ?? derivedName}</span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type TToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: TToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4  text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

/**
 * Props for the tool input section.
 *
 * - `input` is the raw tool input payload, typically an object that
 *   will be pretty-printed as JSON.
 */
export type TToolInputProps = ComponentProps<"div"> & {
  input: TToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: TToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type TToolErrorPanelProps = ComponentProps<"div"> & {
  summary: string;
  copyPayload: string;
};

export const ToolErrorPanel = ({
  className,
  summary,
  copyPayload,
  ...props
}: TToolErrorPanelProps) => {
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(copyPayload).then(() => {
      toast.success("Error details copied");
    });
  }, [copyPayload]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 pb-4 bg-muted/50 rounded-lg border border-border",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
        <p className="min-w-0 text-sm text-muted-foreground">{summary}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit rounded-full"
        onClick={handleCopy}
      >
        <CopyIcon className="mr-2 size-4" />
        Copy error
      </Button>
    </div>
  );
};

/**
 * Props for the tool output section.
 *
 * - `output` is the returned value from the tool, which may be a
 *   React node, object, or string.
 * - `errorText` provides a human-readable description when the tool
 *   failed.
 */
export type TToolOutputProps = ComponentProps<"div"> & {
  output: TToolPart["output"];
  errorText: TToolPart["errorText"];
  tool?: string;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  tool = "tool",
  ...props
}: TToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  if (errorText) {
    const summary = summarizeToolError(tool, { errorText, output });
    const copyPayload = buildToolErrorPayload(tool, { errorText, output });

    return (
      <div className={cn("space-y-2", className)} {...props}>
        <ToolErrorPanel summary={summary} copyPayload={copyPayload} />
      </div>
    );
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Result
      </h4>
      <div className="overflow-x-auto rounded-md bg-muted/50 text-xs text-foreground [&_table]:w-full">
        {Output}
      </div>
    </div>
  );
};

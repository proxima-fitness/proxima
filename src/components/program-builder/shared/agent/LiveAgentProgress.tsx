"use client";

import { useMemo, memo } from "react";
import type { ChatStatus, UIDataTypes, UIMessage, UITools } from "ai";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  BrainIcon,
  SearchIcon,
  ListChecksIcon,
  HammerIcon,
  WrenchIcon,
  PenLineIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface IStep {
  key: string;
  label: string;
  icon: LucideIcon;
  status: "complete" | "active" | "pending";
}

const TOOL_META: Record<string, { label: string; icon: LucideIcon }> = {
  reasoning: { label: "Thinking", icon: BrainIcon },
  "tool-getExerciseList": { label: "Looking up exercises", icon: SearchIcon },
  "tool-getMoreInfoQuestions": { label: "Gathering info", icon: ListChecksIcon },
  "tool-planProgram": { label: "Planning program structure", icon: ListChecksIcon },
  "tool-buildWeek": { label: "Building training week", icon: HammerIcon },
  "tool-modifyProgram": { label: "Modifying program", icon: WrenchIcon },
  text: { label: "Writing response", icon: PenLineIcon },
};

function deriveSteps(
  messages: UIMessage<unknown, UIDataTypes, UITools>[],
  status: ChatStatus | undefined
): IStep[] {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") return [];

  const parts = lastMessage.parts;
  if (!parts || parts.length === 0) return [];

  const isStreaming = status === "streaming";
  const steps: IStep[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || typeof part !== "object" || !("type" in part)) continue;

    const type = (part as { type: string }).type;
    const meta = TOOL_META[type];
    if (!meta) continue;

    // Deduplicate consecutive reasoning parts
    if (type === "reasoning" && seen.has("reasoning")) continue;
    seen.add(type);

    const isLast = i === parts.length - 1;
    let stepStatus: IStep["status"];

    if (isLast && isStreaming) {
      stepStatus = "active";
    } else {
      const toolState =
        "state" in part ? (part as { state?: string }).state : undefined;
      if (
        toolState === "input-streaming" ||
        toolState === "input-available"
      ) {
        stepStatus = "active";
      } else {
        stepStatus = "complete";
      }
    }

    steps.push({
      key: `${type}-${i}`,
      label: meta.label,
      icon: meta.icon,
      status: stepStatus,
    });
  }

  return steps;
}

interface ILiveAgentProgressProps {
  messages: UIMessage<unknown, UIDataTypes, UITools>[];
  status?: ChatStatus;
  isLoading: boolean;
  className?: string;
}

export const LiveAgentProgress = memo(
  ({ messages, status, isLoading, className }: ILiveAgentProgressProps) => {
    const steps = useMemo(
      () => deriveSteps(messages, status),
      [messages, status]
    );

    if (!isLoading || steps.length === 0) return null;

    const activeStep = steps.find((s) => s.status === "active");
    const headerLabel = activeStep?.label ?? "Working…";

    return (
      <div className={className}>
        <ChainOfThought defaultOpen open>
          <ChainOfThoughtHeader>
            <Shimmer duration={1.5}>{headerLabel}</Shimmer>
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {steps.map((step) => (
              <ChainOfThoughtStep
                key={step.key}
                icon={step.icon}
                label={step.label}
                status={step.status}
              />
            ))}
          </ChainOfThoughtContent>
        </ChainOfThought>
      </div>
    );
  }
);

LiveAgentProgress.displayName = "LiveAgentProgress";

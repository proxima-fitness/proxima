// SPDX-License-Identifier: AGPL-3.0-only

"use client";

import { useMemo, memo } from "react";
import type { ChatStatus } from "ai";
import {
  TChainOfThought,
  TChainOfThoughtContent,
  TChainOfThoughtHeader,
  TChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  BrainIcon,
  SearchIcon,
  ListChecksIcon,
  HammerIcon,
  WrenchIcon,
  PenLineIcon,
  Award,
  KeyRoundIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HEVY_EXPORT_GATE_PROGRESS_LABEL } from "./HevyExportGate";

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
  "tool-openHevyExportGate": { label: HEVY_EXPORT_GATE_PROGRESS_LABEL, icon: KeyRoundIcon },
  "tool-buildProgram": { label: "Building your program", icon: HammerIcon },
  "tool-mutateProgram": { label: "Mutating program", icon: WrenchIcon },
  "tool-rateProgram": { label: "Rating program", icon: Award },
  text: { label: "Writing response", icon: PenLineIcon },
};

function deriveSteps(
  messages: TChatMessage[],
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
  messages: TChatMessage[];
  status?: ChatStatus;
  isLoading: boolean;
  className?: string;
}

function isStreamingFinalText(
  messages: TChatMessage[],
  status: ChatStatus | undefined
): boolean {
  if (status !== "streaming") return false;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") return false;
  const parts = lastMessage.parts;
  if (!parts?.length) return false;
  const lastPart = parts[parts.length - 1];
  return (
    lastPart != null &&
    typeof lastPart === "object" &&
    "type" in lastPart &&
    (lastPart as { type: string }).type === "text"
  );
}

export const LiveAgentProgress = memo(
  ({ messages, status, isLoading, className }: ILiveAgentProgressProps) => {
    const steps = useMemo(
      () => deriveSteps(messages, status),
      [messages, status]
    );

    if (!isLoading) return null;

    if (isStreamingFinalText(messages, status)) return null;

    if (steps.length === 0) {
      // submitted = waiting on first model tokens; streaming w/ no parts yet = Working
      const fallbackLabel =
        status === "submitted" ? "Analyzing..." : "Working…";
      return (
        <div className={className}>
          <TChainOfThought defaultOpen open>
            <TChainOfThoughtHeader>
              <Shimmer duration={1.5}>{fallbackLabel}</Shimmer>
            </TChainOfThoughtHeader>
          </TChainOfThought>
        </div>
      );
    }

    const activeStep = steps.find((s) => s.status === "active");
    const headerLabel = activeStep?.label ?? "Working…";

    return (
      <div className={className}>
        <TChainOfThought defaultOpen open>
          <TChainOfThoughtHeader>
            <Shimmer duration={1.5}>{headerLabel}</Shimmer>
          </TChainOfThoughtHeader>
          <TChainOfThoughtContent>
            {steps.map((step) => (
              <TChainOfThoughtStep
                key={step.key}
                icon={step.icon}
                label={step.label}
                status={step.status}
              />
            ))}
          </TChainOfThoughtContent>
        </TChainOfThought>
      </div>
    );
  }
);

LiveAgentProgress.displayName = "LiveAgentProgress";

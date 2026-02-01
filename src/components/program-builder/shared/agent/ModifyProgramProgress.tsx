"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TModifyProgramRoutineObjective } from "@/components/program-builder/utils/helpers";

export interface IProps {
    objectivesByRoutine: TModifyProgramRoutineObjective[];
    status: "processing" | "complete";
}

export const ModifyProgramProgress: React.FC<IProps> = ({
    objectivesByRoutine,
    status,
}) => {
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
    const isComplete = status === "complete";
    const hasRoutines = objectivesByRoutine.length > 0;

    const toggleExpanded = (routineIndex: number) => {
        setExpandedIndices((prev) => {
            const next = new Set(prev);
            if (next.has(routineIndex)) next.delete(routineIndex);
            else next.add(routineIndex);
            return next;
        });
    };

    return (
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
            <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border border-border">
                <p className="font-medium text-sm text-foreground">
                    {isComplete ? "Program modified" : "Applying program changes…"}
                </p>
                <div className="flex flex-col gap-1.5">
                    {hasRoutines ? (
                        objectivesByRoutine.map(({ routineIndex, routineLabel, details, folder_id }, idx) => {
                            const isExpanded = expandedIndices.has(routineIndex);
                            const nextFolderId = objectivesByRoutine[idx + 1]?.folder_id;
                            const isEndOfWeek = nextFolderId !== folder_id;
                            return (
                                <div key={routineIndex} className="flex flex-col gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpanded(routineIndex)}
                                        className="flex items-center gap-2 w-full text-left rounded-md hover:bg-muted/50 py-0.5 -mx-1 px-1"
                                    >
                                        <span
                                            className={cn(
                                                "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-300",
                                                isComplete ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                                            )}
                                        />
                                        <span className="flex-1 text-sm text-foreground">
                                            {routineLabel}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                                        )}
                                    </button>
                                    {isExpanded && (
                                        <div className="flex flex-col items-start pl-5 pr-4 py-1 space-y-0.5 text-sm text-muted-foreground">
                                            {details.map((d, i) => (
                                                <span key={i}>{d}</span>
                                            ))}
                                        </div>
                                    )}
                                    {isEndOfWeek && (
                                        <hr className="border-border my-1 w-full" />
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-300",
                                    isComplete ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                                )}
                            />
                            <span className="text-sm text-muted-foreground">
                                {isComplete ? "Patch applied" : "Applying patch…"}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

import { classifySessionGoal, SESSION_GOAL_LABELS, SESSION_GOAL_TOOLTIPS } from "@/api/session-goal";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ISessionGoalBadgeProps {
    day: Pick<THevyRoutine, "exercises">;
}

/** Session goal pill - hidden when workout has no qualifying working sets. */
export function SessionGoalBadge({ day }: ISessionGoalBadgeProps) {
    const goal = classifySessionGoal(day);
    if (!goal) return null;

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        variant="secondary"
                        className="cursor-help font-normal"
                        aria-label={`${SESSION_GOAL_LABELS[goal]} session goal`}
                    >
                        {SESSION_GOAL_LABELS[goal]}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-[240px] bg-lightSecondary text-left leading-snug text-white"
                >
                    {SESSION_GOAL_TOOLTIPS[goal]}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

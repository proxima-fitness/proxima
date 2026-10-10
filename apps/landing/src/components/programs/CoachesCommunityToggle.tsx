// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module CoachesCommunityToggle
 * @description Segmented toggle that switches between coach-created and community-created program views while surfacing program counts.
 * @dependsOn React client rendering and parent program search layout state.
 * @usedBy Program discovery pages to let users flip between curated coach programs and community programs.
 */

/**
 * Props for `CoachesCommunityToggle`.
 * @property viewMode Current active view, either "coaches" or "community".
 * @property onViewModeChange Callback invoked when the user selects a different view mode.
 * @property coachCount Number of programs available in the coaches view.
 * @property communityCount Number of programs available in the community view.
 */
interface IProps {
    viewMode: "coaches" | "community";
    onViewModeChange: (mode: "coaches" | "community") => void;
    coachCount: number;
    communityCount: number;
}

/**
 * CoachesCommunityToggle renders a two-state segmented control for switching between coach and community program feeds.
 */
export function CoachesCommunityToggle({
    viewMode,
    onViewModeChange,
    coachCount,
    communityCount,
}: IProps) {
    return (
        <div
            className="inline-flex rounded-2xl bg-muted/40 p-1 ring-1 ring-black/[0.06] dark:bg-muted/25 dark:ring-white/10"
            role="tablist"
            aria-label="Program source"
        >
            <button
                type="button"
                role="tab"
                onClick={ () => onViewModeChange("coaches") }
                className={ `relative flex min-w-[8rem] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    viewMode === "coaches"
                        ? "bg-background text-foreground shadow-sm dark:bg-extraDarkGray"
                        : "text-muted-foreground hover:text-foreground"
                }` }
                aria-selected={ viewMode === "coaches" }
                aria-label={ `Coaches, ${coachCount} programs` }
            >
                <span>Coaches</span>
                <span className="tabular-nums text-xs text-muted-foreground">{ coachCount }</span>
            </button>
            <button
                type="button"
                role="tab"
                onClick={ () => onViewModeChange("community") }
                className={ `relative flex min-w-[8rem] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    viewMode === "community"
                        ? "bg-background text-foreground shadow-sm dark:bg-extraDarkGray"
                        : "text-muted-foreground hover:text-foreground"
                }` }
                aria-selected={ viewMode === "community" }
                aria-label={ `Community, ${communityCount} programs` }
            >
                <span>Community</span>
                <span className="tabular-nums text-xs text-muted-foreground">{ communityCount }</span>
            </button>
        </div>
    );
}

"use client";

/*
 * @module CoachesCommunityToggle
 * @description Segmented toggle that switches between coach-created and community-created program views while surfacing program counts.
 * @dependsOn React client rendering, shared button styles, and parent program search layout state.
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
 * CoachesCommunityToggle renders a two-state pill control for switching between coach and community program feeds.
 */
export function CoachesCommunityToggle({
    viewMode,
    onViewModeChange,
    coachCount,
    communityCount,
}:  IProps) {
    return (
        <div className="w-full">
            <div className="inline-flex rounded-lg overflow-hidden border border-lightGray dark:border-darkGray bg-lightGray dark:bg-darkGray">
                <button
                    type="button"
                    onClick={() => onViewModeChange("coaches")}
                    className={`
                        px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors
                        ${viewMode === "coaches"
                            ? "bg-lightSecondary text-primary dark:text-primary"
                            : "bg-white dark:bg-extraDarkGray text-gray-500 dark:text-dimWhite hover:bg-extraLightGray dark:hover:bg-blueGray"
                        }
                    `}
                    aria-pressed={viewMode === "coaches"}
                    aria-label={`By coaches (${coachCount} programs)`}
                >
                    BY COACHES ({coachCount})
                </button>
                <button
                    type="button"
                    onClick={() => onViewModeChange("community")}
                    className={`
                        px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors
                        ${viewMode === "community"
                            ? "bg-lightSecondary text-primary dark:text-primary"
                            : "bg-white dark:bg-extraDarkGray text-gray-500 dark:text-dimWhite hover:bg-extraLightGray dark:hover:bg-blueGray"
                        }
                    `}
                    aria-pressed={viewMode === "community"}
                    aria-label={`By community (${communityCount} programs)`}
                >
                    BY COMMUNITY ({communityCount})
                </button>
            </div>
            <div className="h-0.5 w-full bg-lightSecondary mt-0.5" aria-hidden />
        </div>
    );
}

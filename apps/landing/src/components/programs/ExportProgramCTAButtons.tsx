// SPDX-License-Identifier: AGPL-3.0-only

/*
 * @module ExportProgramCTAButtons
 * @description Button list for selecting how to export a program (PDF, spreadsheet, coming-soon destinations).
 * @dependsOn React JSX runtime and shared icon components provided via props.
 * @usedBy `ExportProgramCTA` and `ExportDialog`.
 */

import { JSX } from "react";

/**
 * Props for `ExportProgramCTAButtons`.
 * @property programId Identifier of the program to be exported (used for analytics or future wiring).
 * @property exportOptions List of export options including metadata such as id, label, icon, and disabled state.
 * @property onSelectExport Optional callback fired when a user selects a non-disabled export option.
 * @property showComingSoonLabel Whether to show a "Coming soon" label above disabled options.
 */
interface IProps {
    programId: number;
    exportOptions: {
        id: string;
        name: string;
        icon: JSX.Element;
        subtitle?: string;
        brand: boolean;
        disabled?: boolean;
    }[];
    onSelectExport?: (id: string) => void;
    showComingSoonLabel?: boolean;
}

/**
 * ExportProgramCTAButtons renders actionable and disabled export options, optionally grouping disabled ones under a "coming soon" label.
 */
export const ExportProgramCTAButtons: React.FC<IProps> = ({
    exportOptions,
    onSelectExport,
    showComingSoonLabel = true,
}) => {

    const handleClick = (option: { id: string; disabled?: boolean }) => {
        if (option.disabled) return;
        if (onSelectExport) {
            onSelectExport(option.id);
        }
    };

    const enabledOptions = exportOptions.filter((o) => !o.disabled);
    const disabledOptions = exportOptions.filter((o) => o.disabled);

    const renderOption = (option: (typeof exportOptions)[number]) => {
        return (
        <button
            key={option.id}
            disabled={option.disabled ?? false}
            onClick={() => handleClick(option)}
            className="flex w-full cursor-pointer flex-col items-stretch gap-1 rounded-xl border border-border/60 bg-muted/35 px-4 py-3.5 text-left text-foreground shadow-sm transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-muted/15 dark:hover:bg-muted"
            aria-label={`Export as ${option.name}`}
        >
            <div className="flex flex-row items-center gap-3">
                <span className="flex shrink-0 items-center text-foreground [&_svg]:h-6 [&_svg]:w-6">{option.icon}</span>
                {!option.brand ? <span className="font-third text-base font-semibold">{option.name}</span> : null}
            </div>
            {option.subtitle ? <span className="text-sm text-muted-foreground">{option.subtitle}</span> : null}
        </button>
        );
    };

    return (
        <div className="flex flex-col gap-2">
            {enabledOptions.map(renderOption)}
            {showComingSoonLabel && disabledOptions.length > 0 ? (
                <>
                    {disabledOptions.map(renderOption)}
                </>
            ) : (
                disabledOptions.map(renderOption)
            )}
        </div>
    );
};

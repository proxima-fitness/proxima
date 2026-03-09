/*
 * @module ExportProgramCTAButtons
 * @description Button list for selecting how to export a program (e.g., to partner apps or file formats).
 * @dependsOn React JSX runtime, shared icon components provided via props, and parent export CTA wrappers.
 * @usedBy `ExportProgramCTA` to render export options for the current program.
 */

import { JSX } from "react";
import { hevy_logo } from "public";

/**
 * Props for `ExportProgramCTAButtons`.
 * @property programId Identifier of the program to be exported (used for analytics or future wiring).
 * @property exportOptions List of export options including metadata such as id, label, icon, and disabled state.
 * @property onSelectExport Optional callback fired when a user selects a non-disabled export option.
 * @property showComingSoonLabel Whether to show a "Coming soon" label above disabled options.
 * @property hideHevyCrown When true, render the Hevy option without the Crown icon.
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
    hideHevyCrown?: boolean;
}

/**
 * ExportProgramCTAButtons renders actionable and disabled export options, optionally grouping disabled ones under a "coming soon" label.
 */
export const ExportProgramCTAButtons: React.FC<IProps> = ({
    programId,
    exportOptions,
    onSelectExport,
    showComingSoonLabel = true,
    hideHevyCrown = false,
}) => {

    console.log("programId", programId);

    // const handleExport = (exportType: string) => {
    //     // Placeholder for export functionality
    //     //console.log(`Export to ${exportType} for program ${programId}`);
    //     // TODO: Implement export functionality
    // };

    const handleClick = (option: { id: string; disabled?: boolean }) => {
        if (option.disabled) return;
        if (onSelectExport) {
            onSelectExport(option.id);
        }
    };

    const enabledOptions = exportOptions.filter((o) => !o.disabled);
    const disabledOptions = exportOptions.filter((o) => o.disabled);

    const renderOption = (option: (typeof exportOptions)[number]) => {
        const isHevy = option.id === "hevy";
        const effectiveIcon =
            hideHevyCrown && isHevy ? (
                <div className="flex items-center gap-2">
                    <img
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        src={(hevy_logo as any).src}
                        alt="Hevy"
                        className="w-full h-6 object-contain"
                    />
                </div>
            ) : (
                option.icon
            );

        return (
        <button
            key={option.id}
            disabled={option.disabled ?? false}
            onClick={() => handleClick(option)}
            className="cursor-pointer flex flex-col items-start justify-between gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Export as ${option.name}`}
        >
            <div className="flex flex-row gap-3">
                <span className="">{effectiveIcon}</span>
                {!option.brand ? <span className="font-main text-lg">{option.name}</span> : null}
            </div>
            {option.subtitle ? <span className="text-sm  text-left text-gray-400">{option.subtitle}</span> : null}
        </button>
        );
    };

    return (
        <div className="flex flex-col gap-3">
            {enabledOptions.map(renderOption)}
            {showComingSoonLabel && disabledOptions.length > 0 ? (
                <>
                    <p className="text-sm text-gray-400 pt-2">Coming soon…</p>
                    {disabledOptions.map(renderOption)}
                </>
            ) : (
                disabledOptions.map(renderOption)
            )}
        </div>
    );
};

import { JSX } from "react";

interface IProps {
    programId: number;
    exportOptions:{
        id: string;
        name: string;
        icon: JSX.Element;
        subtitle?: string;
        brand: boolean;
        disabled?: boolean;
    }[];
    onSelectExport?: (id: string) => void;
}

export const ExportProgramCTAButtons: React.FC<IProps> = ({ programId, exportOptions, onSelectExport }) => {

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

    const renderOption = (option: (typeof exportOptions)[number]) => (
        <button
            key={option.id}
            disabled={option.disabled ?? false}
            onClick={() => handleClick(option)}
            className="cursor-pointer flex flex-col items-start justify-between gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <div className="flex flex-row gap-3">
                <span className="">{option.icon}</span>
                {!option.brand ? <span className="font-main text-lg">{option.name}</span> : null}
            </div>
            {option.subtitle ? <span className="text-sm text-gray-400">{option.subtitle}</span> : null}
        </button>
    );

    return (
        <div className="flex flex-col gap-3">
            {enabledOptions.map(renderOption)}
            {disabledOptions.length > 0 && (
                <>
                    <p className="text-sm text-gray-400 pt-2">Coming soon</p>
                    {disabledOptions.map(renderOption)}
                </>
            )}
        </div>
    );
};

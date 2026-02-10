import { JSX } from "react";

interface IProps {
    programId: number;
    exportOptions:{
        id: string;
        name: string;
        icon: JSX.Element;
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

    return (
        <div className="flex flex-col gap-3">
            {exportOptions.map((option) => (
                <button
                    key={option.id}
                    disabled={option.disabled ?? false}
                    onClick={() => handleClick(option)}
                    className="cursor-pointer flex flex-row items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="flex-shrink-0">{option.icon}</span>
                    {!option.brand ? <span className="font-main text-lg">{option.name}</span> : null}
                </button>
            ))}
        </div>
    );
};

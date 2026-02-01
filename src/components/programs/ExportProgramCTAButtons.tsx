import { JSX } from "react";

interface IProps {
    programId: number;
    exportOptions:{
        id: string;
        name: string;
        icon: JSX.Element;
        brand: boolean;
    }[];
}

export const ExportProgramCTAButtons: React.FC<IProps> = ({ programId, exportOptions }) => {

    console.log(programId);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleExport = (exportType: string) => {
        // Placeholder for export functionality
        //console.log(`Export to ${exportType} for program ${programId}`);
        // TODO: Implement export functionality
    };

    return (
        <div className="flex flex-col gap-3">
            {exportOptions.map((option) => (
                <button
                    key={option.id}
                    disabled={true}
                    onClick={() => handleExport(option.id)}
                    className="flex flex-row items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white"
                >
                    <span className="flex-shrink-0">{option.icon}</span>
                    {!option.brand ? <span className="font-main text-lg">{option.name}</span> : null}
                </button>
            ))}
        </div>
    );
};

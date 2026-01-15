"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { hevy_logo, macrofactor_logo, strong_logo } from "public";
import { FileText, Table } from "lucide-react";

export const ExportProgramCTA: React.FC = () => {
    const exportOptions = [
        {
            id: "hevy",
            name: "Hevy",
            icon: (
                <img
                    src={(hevy_logo as any).src}
                    alt="Hevy"
                    className="w-full h-6 object-contain"
                />
            ),
            brand: true,
        },
        {
            id: "macrofactor",
            name: "Macrofactor",
            icon: (
                <img
                    src={(macrofactor_logo as any).src}
                    alt="Macrofactor"
                    className="w-full h-6 object-contain"
                />
            ),
            brand: true,
        },
        {
            id: "strong",
            name: "Strong",
            icon: (
                <img
                    src={(strong_logo as any).src}
                    alt="Strong"
                    className="w-full h-6 "
                />
            ),
            brand: true,
        },
        {
            id: "pdf",
            name: "PDF",
            icon: <FileText className="w-6 h-6" />,
            brand: false,
        },
        {
            id: "spreadsheet",
            name: "Spreadsheet",
            icon: <Table className="w-6 h-6" />,
            brand: false,
        },
    ];

    const handleExport = (exportType: string) => {
        // Placeholder for export functionality
        console.log(`Export to ${exportType}`);
        // TODO: Implement export functionality
    };

    return (
        <div className="rounded-xl bg-gray-900 border-l border-gray-300 flex flex-col text-center justify-start items-center px-8 w-full h-full max-sm:h-auto max-sm:pb-4">
            <div className="flex flex-col w-full">
                <h2 className="font-main text-5xl max-sm:text-3xl pt-4 font-bold text-white">Export Program</h2>
                <div className="max-sm:pt-2 pt-6 flex flex-col gap-3 w-full">
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
            </div>
        </div>
    );
};

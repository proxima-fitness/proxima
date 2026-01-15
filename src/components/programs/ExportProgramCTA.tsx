"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { hevy_logo } from "public";
import { FileText, Table } from "lucide-react";
import styles from "@/style";

export const ExportProgramCTA: React.FC = () => {
    const exportOptions = [
        {
            id: "hevy",
            name: "Hevy",
            icon: (
                <img 
                    src={(hevy_logo as any).src} 
                    alt="Hevy" 
                    className="w-6 h-6 object-contain" 
                />
            ),
        },
        {
            id: "macrofactor",
            name: "Macrofactor",
            icon: (
                <div className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-white text-xs font-bold">
                    MF
                </div>
            ),
        },
        {
            id: "strong",
            name: "Strong",
            icon: (
                <div className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-white text-xs font-bold">
                    S
                </div>
            ),
        },
        {
            id: "pdf",
            name: "PDF",
            icon: <FileText className="w-6 h-6" />,
        },
        {
            id: "spreadsheet",
            name: "Spreadsheet",
            icon: <Table className="w-6 h-6" />,
        },
    ];

    const handleExport = (exportType: string) => {
        // Placeholder for export functionality
        console.log(`Export to ${exportType}`);
        // TODO: Implement export functionality
    };

    return (
        <div className="rounded-xl bg-gray-900 h-[500px] border-l border-gray-300 flex flex-col text-center justify-center items-center px-8">
            <div className="flex flex-col w-full">
                <h2 className={styles.heading2}>Export Program</h2>
                <div className="pt-6 flex flex-col gap-3 w-full">
                    {exportOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleExport(option.id)}
                            className="flex flex-row items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white"
                        >
                            <span className="flex-shrink-0">{option.icon}</span>
                            <span className="font-main text-sm">{option.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

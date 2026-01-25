"use client";

import { SparklesIcon } from "lucide-react";
import Link from "next/link";
interface IProps {
    programId: string;
}

export const EditProgramCTA: React.FC<IProps> = ({ programId }) => {
    return (
        <div className="rounded-xl dark:bg-gray-900 bg-extraLightGray border-l border-gray-300 flex flex-col text-center justify-center items-center px-8 py-8 h-full w-full">
            <div className="flex flex-col w-full">
                <h2 className="font-main text-4xl pt-4 font-bold text-black dark:text-white">Customize program with AI</h2>
                <div className="pt-6">
                    <Link
                        href={`/build-program?shareId=${programId}&edit=true&shared=true`}
                        className="flex flex-row items-center justify-center gap-3 px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        <span className="font-main text-sm">Customize</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

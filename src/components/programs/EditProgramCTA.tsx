"use client";

/*
 * @module EditProgramCTA
 * @description Call-to-action card that deep-links into the builder so users can customize a shared workout program with AI.
 * @dependsOn Next.js routing, lucide-react icon primitives, and shared button styling.
 * @usedBy Program detail layouts to surface an entry point for AI-assisted program customization.
 */

/**
 * Props for `EditProgramCTA`.
 * @property programId Identifier of the program that should be opened in the builder for editing.
 */
import { SparklesIcon } from "lucide-react";
import Link from "next/link";
interface IProps {
    programId: number;
}

/**
 * EditProgramCTA renders a prominent card that links to the AI builder with the selected program preloaded for customization.
 */
export const EditProgramCTA: React.FC<IProps> = ({ programId }) => {
    return (
        <div className="rounded-xl dark:bg-darkGray bg-extraLightGray shadow-md flex flex-col text-center justify-center items-center px-8 py-8 h-full w-full">
            <div className="flex flex-col w-full">
                <h2 className="font-main text-4xl pt-4 font-bold text-black dark:text-white">Personalize Program</h2>
                <div className="pt-6">
                    <Link
                        href={`/build-program?shareId=${programId.toString()}`}
                        className="flex flex-row items-center text-white bg-lightSecondary hover:bg-black  justify-center gap-3 px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        <span className="font-main text-sm">Personalize</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

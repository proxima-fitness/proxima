/* eslint-disable @next/next/no-img-element */
"use client";

/*
 * @module ProgramCard
 * @description Presentational card for a single shared program including thumbnail, metadata, and Join.
 * @dependsOn User context, ProgramJoinButton, thumbnail assets, and badge UI.
 * @usedBy Program lists and grids wherever individual programs need to be previewed with Join / Leave.
 */

/**
 * Props for `ProgramCard`.
 * @property program Program data model used to render title, metadata, and Join state.
 */
import { thumbnail } from "public";
import { FullName } from "../generic/FullName";
import { Badge } from "@/components/ui/badge";
import { Users2Icon } from "lucide-react";
import { ProgramJoinButton } from "./ProgramJoinButton";

interface IProps {
    program: TProgram;
}

/**
 * ProgramCard renders a clickable program preview with thumbnail, author, difficulty chips, and Join.
 */
export const ProgramCard: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-card rounded-2xl  shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md dark:border-white/10 dark:bg-card/80 cursor-pointer">
                <div className="relative overflow-hidden">
                    <img
                        src={ program.thumbnail instanceof Blob ? URL.createObjectURL(program.thumbnail) : thumbnail.src }
                        alt="Program Thumbnail"
                        className="w-full h-[200px] object-cover transition-transform duration-300 hover:scale-105"
                        style={ { objectFit: "cover" } }
                    />
                    <div className="absolute top-2 right-2 z-10">
                        <ProgramJoinButton
                            programId={program.id}
                            variant="overlay"
                            stopClickPropagation
                        />
                    </div>
                </div>
                <div className="p-4 space-y-goldenSm">
                    <div className={ "flex flex-row justify-start items-center font-bold text-xs text-blue-400" }>
                        <Users2Icon className=" h-3 w-3 mr-1" /> {program?.saves} Lifters Joined
                    </div>

                    <div className=" dark:text-offWhite uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                        Program By <FullName id={ program.id } id_type={ "program" } />
                    </div>
                    <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1">{ program.title }</h3>
                    <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
                        <Badge className="text-[10px] text-white p-1 bg-lightSecondary dark:bg-gray-300 dark:text-black whitespace-nowrap shrink-0">{ program?.difficulty?.map((level: string ) => level).join(' - ') || "Not specified"  }</Badge>
                        <Badge className="text-[10px] text-white p-1 bg-lightSecondary dark:bg-gray-300 dark:text-black whitespace-nowrap shrink-0">{ program?.equipment || "Not specified" }</Badge>
                        <Badge className="text-[10px] text-white p-1 bg-lightSecondary dark:bg-gray-300 dark:text-black whitespace-nowrap shrink-0">{ program?.workout_duration || "Not specified" } Mins</Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};

/*
 * @module ProgramsSlugLayout
 * @description Server-side layout for an individual program slug page, assembling thumbnails, creator context, overview, and export/edit CTAs.
 * @dependsOn SSR hooks for program and user metadata, program preview and overview components, export/edit CTAs, and layout utilities.
 * @usedBy Dynamic program routes to present a full-view experience for a single shared program.
 */

import { ExportProgramCTA } from "./ExportProgramCTA";
import { EditProgramCTA } from "./EditProgramCTA";
import { useOpUserMetadataSSR, useProgramByIdSSR, useUserFullNameSSR } from "@/api/hooks";
import { ProgramPreview } from "./ProgramPreview";
import { sortWorkouts } from "@/utils/general/helpers";
import { FC } from "react";
import { Card } from "../ui/card";
import { ProgramOverviewCard } from "./ProgramOverviewCard";
import { ProgramThumbnail } from "./ProgramThumbnail";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CalendarIcon, User } from "lucide-react";
import { convertSupabaseDateToReadable } from "@/utils/general/helpers";

interface IProps {
    id: number;
}

/**
 * ProgramsSlugLayout composes server-fetched program data into a rich program detail page including preview and export options.
 */
export const ProgramsSlugLayout: FC<IProps> =  async (props) => {

    const { id } = props;
    // eslint-disable-next-line
    const program: TProgramPage | undefined = await useProgramByIdSSR(id);
    // eslint-disable-next-line
    const fullName = await useUserFullNameSSR(id, "program");
    // eslint-disable-next-line
    const programCreatorMetadata = await useOpUserMetadataSSR(id.toString());
    // const programCreatorProfilePic = await useOpProfilePictureByIdSSR(id);

    let sortedWorkoutsByWeek: TScheduleWorkouts[][] = [];
    if (program && program.schedule && program.schedule.length > 0) {
        sortedWorkoutsByWeek = sortWorkouts(program.schedule[0].schedule_workouts);
    }

    return (
        <>
            <div className="grid grid-cols-3 max-sm:grid-cols-1 grid-rows-[350px_auto_auto] max-sm:grid-rows-none gap-x-12 max-sm:gap-x-0 gap-y-6 md:gap-y-8 pb-8">
                { program && fullName && programCreatorMetadata &&
                    <>
                        <div className="col-span-2 row-start-1 max-sm:col-span-1">
                            <ProgramThumbnail id={ id } />
                        </div>
                        <Card className="col-span-2 row-start-2 py-4 pl-4 bg-gray-100 dark:bg-darkGray max-sm:col-span-1" id="program-title-card">
                            <div className="text-xl uppercase pb-2">
                                PROGRAM BY {" "}
                                <HoverCard>
                                    <HoverCardTrigger className="hover:underline">
                                        { fullName }
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72 h-auto">
                                        <div className="flex justify-around space-x-4">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-semibold">{ fullName }</h4>
                                                <p className="text-sm">
                                                    { programCreatorMetadata.bio }
                                                </p>
                                                <div className="flex items-center pt-2">
                                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />{" "}
                                                    <span className="text-xs text-muted-foreground">
                                                        Joined {convertSupabaseDateToReadable(programCreatorMetadata.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            </div>
                            <div className="text-3xl font-main ">
                                { program.program[0].title }
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-sm text-secondary dark:text-lightSecondary">
                                <User className="h-4 w-4" aria-hidden="true" />
                                <span>
                                    {program.program[0].saves} {program.program[0].saves === 1 ? "lifter has" : "lifters have"} joined
                                </span>
                            </div>
                        </Card>
                        <div className="col-span-2 row-start-3 max-sm:col-span-1">
                            <ProgramOverviewCard program={ program } />
                        </div>
                        <div className="row-span-2 row-start-1 flex items-start h-full max-sm:row-span-1 max-sm:row-start-auto">
                            <ExportProgramCTA programId={id} sortedWorkoutsByWeek={sortedWorkoutsByWeek} />
                        </div>
                        <div className="row-start-3 h-full max-sm:row-start-auto">
                            <EditProgramCTA programId={id} />
                        </div>
                    </>
                }
            </div>
            { sortedWorkoutsByWeek &&
                <ProgramPreview sortedWorkoutsByWeek={ sortedWorkoutsByWeek } />
            }
        </>
    );
};

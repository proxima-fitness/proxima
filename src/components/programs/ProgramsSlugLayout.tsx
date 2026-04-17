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
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_min(340px,32vw)] lg:gap-x-12 lg:gap-y-8 lg:items-start">
                { program && fullName && programCreatorMetadata &&
                    <>
                        <div className="order-1 lg:col-start-1 lg:row-start-1">
                            <ProgramThumbnail id={ id } />
                        </div>
                        <Card
                            className="order-2 border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:bg-card/60 lg:col-start-1 lg:row-start-2 rounded-2xl p-6 sm:p-8"
                            id="program-title-card"
                        >
                            <div className="text-sm font-medium text-muted-foreground">
                                Program by{" "}
                                <HoverCard>
                                    <HoverCardTrigger className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-secondary dark:hover:text-lightSecondary">
                                        { fullName }
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72 h-auto rounded-xl border-border/60 shadow-lg">
                                        <div className="flex justify-around space-x-4">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-semibold">{ fullName }</h4>
                                                <p className="text-sm text-muted-foreground">
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
                            <h1 className="mt-3 font-third text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                { program.program[0].title }
                            </h1>
                            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>
                                    {program.program[0].saves} {program.program[0].saves === 1 ? "lifter has" : "lifters have"} joined
                                </span>
                            </div>
                        </Card>
                        <div className="order-4 lg:col-start-1 lg:row-start-3">
                            <ProgramOverviewCard program={ program } />
                        </div>
                        <aside className="order-3 flex flex-col gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
                            <ExportProgramCTA programId={id} sortedWorkoutsByWeek={sortedWorkoutsByWeek} />
                            <EditProgramCTA programId={id} />
                        </aside>
                    </>
                }
            </div>
            { sortedWorkoutsByWeek &&
                <div className="mt-10 md:mt-12">
                    <ProgramPreview sortedWorkoutsByWeek={ sortedWorkoutsByWeek } />
                </div>
            }
        </>
    );
};

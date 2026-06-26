/*
 * @module ProgramsSlugLayout
 * @description Server-side layout for an individual program slug page, assembling thumbnails, creator context, overview, and export/edit CTAs.
 * @dependsOn SSR hooks for program and user metadata, program preview and overview components, export/edit CTAs, and layout utilities.
 * @usedBy Dynamic program routes to present a full-view experience for a single shared program.
 */

import { ExportProgramCTA } from "./ExportProgramCTA";
import { EditProgramCTA } from "./EditProgramCTA";
import { useOpUserMetadataSSR, useProgramByIdSSR, useUserFullNameSSR } from "@/api/hooks";
import { ANONYMOUS_USER_METADATA } from "@/api/users";
import { ProgramPreview } from "./ProgramPreview";
import { sortWorkouts } from "@/utils/general/helpers";
import { FC } from "react";
import { Card } from "../ui/card";
import { ProgramOverviewCard } from "./ProgramOverviewCard";
import { ProgramCreatorHoverCard } from "./ProgramCreatorHoverCard";
import { ProgramThumbnail } from "./ProgramThumbnail";
import { User } from "lucide-react";
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

    if (!program) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card/50 px-6 py-12 text-center shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Program not found
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    This program could not be loaded. Try again later.
                </p>
            </div>
        );
    }

    const displayFullName = fullName?.trim() ? fullName : "Anonymous";
    const creatorMeta = programCreatorMetadata ?? ANONYMOUS_USER_METADATA;
    const joinedLine = creatorMeta.created_at
        ? `Joined ${convertSupabaseDateToReadable(creatorMeta.created_at)}`
        : "";

    return (
        <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_min(340px,32vw)] lg:gap-x-12 lg:gap-y-8 lg:items-start">
                        <div className="order-1 lg:col-start-1 lg:row-start-1">
                            <ProgramThumbnail id={ id } />
                        </div>
                        <Card
                            className="order-2 border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:bg-card/60 lg:col-start-1 lg:row-start-2 rounded-2xl p-6 sm:p-8"
                            id="program-title-card"
                        >
                            <div className="text-sm font-medium text-muted-foreground">
                                Program by{" "}
                                <ProgramCreatorHoverCard
                                    fullName={displayFullName}
                                    bio={creatorMeta.bio}
                                    joinedReadable={joinedLine || "Join date unavailable"}
                                />
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
                        <div className="order-3 lg:col-start-1 lg:row-start-3">
                            <ProgramOverviewCard program={ program } />
                        </div>
                        <aside className="order-4 flex min-h-0 flex-col gap-4 lg:sticky lg:top-0 lg:max-h-dvh lg:overflow-y-auto lg:overscroll-contain lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
                            <ExportProgramCTA programId={id} sortedWorkoutsByWeek={sortedWorkoutsByWeek} />
                            <EditProgramCTA programId={id} />
                        </aside>
            </div>
            { sortedWorkoutsByWeek &&
                <div className="mt-10 md:mt-12">
                    <ProgramPreview sortedWorkoutsByWeek={ sortedWorkoutsByWeek } />
                </div>
            }
        </>
    );
};

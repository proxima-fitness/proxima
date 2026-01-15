import { ExportProgramCTA } from "./ExportProgramCTA";
import { EditProgramCTA } from "./EditProgramCTA";
import { useOpUserMetadataSSR, useProgramByIdSSR, useUserFullNameSSR } from "@/api/hooks";
import { ProgramPreview } from "../program-builder/proxima/ProgramPreview";
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
import { CalendarIcon } from "lucide-react";
import { convertSupabaseDateToReadable } from "@/utils/general/helpers";

interface IProps {
    id: string;
}

export const ProgramsSlugLayout: FC<IProps> =  async (props) => {

    const { id } = props;
    // eslint-disable-next-line
    const program: TProgramPage | undefined = await useProgramByIdSSR(id);
    // eslint-disable-next-line
    const fullName = await useUserFullNameSSR(id, "program");
    // eslint-disable-next-line
    const programCreatorMetadata = await useOpUserMetadataSSR(id);
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
                        </Card>
                        <div className="col-span-2 row-start-3 max-sm:col-span-1">
                            <ProgramOverviewCard program={ program } />
                        </div>
                        <div className="row-span-2 row-start-1 flex items-start h-full max-sm:row-span-1 max-sm:row-start-auto">
                            <ExportProgramCTA />
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

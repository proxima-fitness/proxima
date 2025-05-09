import styles from "@/style";
import { GetStarted } from "../header/GetStarted";
import { useOpUserMetadataSSR, useProgramByIdSSR, useUserFullNameSSR } from "@/api/hooks";
import { ProgramDetails } from "./ProgramDetails";
import { ProgramPreview } from "../program-builder/proxima/ProgramPreview";
import { sortWorkouts } from "@/utils/general/helpers";
import { FC } from "react";

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
            <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-12 max-sm:gap-0 pb-8">
                { program && fullName && programCreatorMetadata &&
                    <ProgramDetails
                        id={ id }
                        program={ program }
                        fullName={ fullName }
                        programCreatorMetadata={ programCreatorMetadata }
                        // programCreatorProfilePic={ programCreatorProfilePic }
                    />
                }
                <div className="rounded-xl bg-gray-900 h-[500px] border-l border-gray-300 flex flex-col text-center justify-center items-center px-8">
                    <div className="flex flex-col">
                        <h2 className={ styles.heading2 }>Download the App For Free</h2>
                        <p className={ `${styles.paragraph}` }>
                            It takes less than a minute
                        </p>
                    </div>
                    <div className="pt-4">
                        <GetStarted noBorder={ true } blog={ true } />
                    </div>
                </div>
            </div>
            { sortedWorkoutsByWeek &&
                <ProgramPreview sortedWorkoutsByWeek={ sortedWorkoutsByWeek } />
            }
        </>
    );
};

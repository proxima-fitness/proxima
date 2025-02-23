import styles from "@/style";
import { GetStarted } from "../header/GetStarted";
import { useOpUserMetadataSSR, useProgramByIdSSR, useUserFullNameSSR } from "@/api/hooks";
import { ProgramDetails } from "./ProgramDetails";
import { ProgramSchedule } from "./ProgramSchedule";
import { sortWorkouts } from "@/utils/helpers";

interface IProps {
    id: string;
}

export const ProgramsSlugLayout: React.FC<IProps> = async (props) => {

    const { id } = props;
    const program: TProgramPage  = await useProgramByIdSSR(id);
    const fullName = await useUserFullNameSSR(id, "program");
    const programCreatorMetadata = await useOpUserMetadataSSR(id);
    // const programCreatorProfilePic = await useOpProfilePictureByIdSSR(id);

    const sortedWorkoutsByWeek = sortWorkouts(program?.schedule[0].schedule_workouts);

    return (
        <>
        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-12 max-sm:gap-0">
            <ProgramDetails
                program={ program }
                fullName={ fullName }
                programCreatorMetadata={ programCreatorMetadata }
                // programCreatorProfilePic={ programCreatorProfilePic }
            />
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
        <ProgramSchedule sortedWorkoutsByWeek={ sortedWorkoutsByWeek } />
        </>
    );
};

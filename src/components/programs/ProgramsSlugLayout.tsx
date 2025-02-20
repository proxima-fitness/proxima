import styles from "@/style";
import { GetStarted } from "../header/GetStarted";
import { useProgramByIdSSR, useUserFullNameSSR } from "@/api/hooks";
import { ProgramThumbnail } from "./ProgramThumbnail";
import { Card } from "../ui/card";
import { FullName } from "../generic/FullName";

interface IProps {
    id: string;
}

export const ProgramsSlugLayout: React.FC<IProps> = async (props) => {

    const { id } = props;
    const program: TProgramPage  = await useProgramByIdSSR(id);
    const fullName = await useUserFullNameSSR(id, "program");
    console.log(program);

    return (
        <>
        <div className="grid grid-cols-3 gap-12">
            <div className="col-span-2 flex flex-col gap-8">
                <div>
                    <ProgramThumbnail thumbnail={program.thumbnail} />
                    </div>
                <Card className="py-4 pl-4 bg-gray-100">
                    <div className="text-xl uppercase pb-2">
                        PROGRAM BY { fullName }
                    </div>
                    <div className="text-3xl font-bold ">
                        { program.program[0].title }
                     </div>
                </Card>
                <Card className="py-4 pl-4 bg-gray-100">
                    <div className="text-xl uppercase pb-2">
                        Program overview
                    </div>
                    <div className="text-3xl font-bold">
                        Program Details
                    </div>
                    <div className="flex flex-col gap-4 pt-4">
                        <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                            <div className="w-[25%] ">
                                Program Length
                            </div>
                            <div className="">
                                { program?.program?.[0]?.program_length ? program.program[0].program_length + " weeks" : "# Weeks"}
                            </div>
                        </div>
                        <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                            <div className="w-[25%]">
                                Program Description
                            </div>
                            <div className="w-[75%]">
                                { (program?.program?.[0]?.details && program.program[0].details.length > 0) ? program.program[0].details : "n/a" }
                            </div>
                        </div>
                        <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                            <div className="w-[25%] ">
                                Workout Duration
                            </div>
                            <div className="w-[75%]">
                                { program?.program?.[0]?.workout_duration ? program.program[0].workout_duration + " mins" : "n/a"}
                            </div>
                        </div>
                        <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                            <div className="w-[25%] ">
                                Equipment
                            </div>
                                <div className="w-[75%]">
                                    { program?.program?.[0]?.equipment && program?.program?.[0]?.equipment.length > 0 ? program.program[0].equipment : "n/a" }
                                </div>
                        </div>
                        <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                            <div className="w-[25%] ">
                                Specialization
                            </div>
                            <div className="w-[75%]">
                                { (program?.program?.[0]?.specialization && program?.program?.[0]?.specialization.length > 0) ? program.program[0].specialization.map((spec) => spec).join(', '): "n/a"}
                            </div>
                        </div>
                        <div className="flex flex-row justify-start items-center">
                            <div className="w-[25%] ">
                                Difficulty
                            </div>
                            <div className="w-[75%]">
                                { (program?.program?.[0]?.difficulty && program?.program?.[0]?.difficulty.length > 0) ? program.program[0].difficulty.map((diff) => diff).join(', '): "n/a"}
                            </div>
                        </div>
                    </div>
                </Card>
                { program.schedule[0].schedule_workouts.map((week) => (
                    <Card key={ "week " + week.nthWeek + "day " + week.nthDay + " " }>
                        <>{"week " + week.nthWeek + "day " + week.nthDay + " "}</>
                    </Card>
                ) ) }
            </div>
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

        </>
    );
};

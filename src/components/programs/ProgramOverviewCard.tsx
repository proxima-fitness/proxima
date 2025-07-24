import { Card } from "../ui/card";

interface IProps {
    program: TProgramPage;
}

export const ProgramOverviewCard: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    return (
        <Card className="max-sm:mb-8 py-4 pl-4 bg-gray-100 dark:bg-darkGray">
            <div className="text-xl uppercase pb-2">
                Program overview
            </div>
            <div className="text-3xl font-main">
                Program Details
            </div>
            <div className="flex flex-col gap-4 pt-4">
                <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                    <div className="max-sm:hidden w-[25%] ">
                        Program Length
                    </div>
                    <div className="">
                        { program?.program?.[0]?.program_length ? program.program[0].program_length + " weeks" : "# Weeks"}
                    </div>
                </div>
                <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                    <div className="max-sm:hidden w-[25%]">
                        Program Description
                    </div>
                    <div className="w-[75%]">
                        { (program?.program?.[0]?.details && program.program[0].details.length > 0) ? program.program[0].details : "n/a" }
                    </div>
                </div>
                <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                    <div className="max-sm:hidden w-[25%]">
                        Workout Duration
                    </div>
                    <div className="w-[75%]">
                        { program?.program?.[0]?.workout_duration ? program.program[0].workout_duration + " mins" : "n/a"}
                    </div>
                </div>
                <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                    <div className="max-sm:hidden w-[25%]">
                        Equipment
                    </div>
                    <div className="w-[75%]">
                        { program?.program?.[0]?.equipment && program?.program?.[0]?.equipment.length > 0 ? program.program[0].equipment : "n/a" }
                    </div>
                </div>
                <div className="border-b-2 border-gray-200 flex flex-row justify-start items-center">
                    <div className="max-sm:hidden w-[25%]">
                        Specialization
                    </div>
                    <div className="w-[75%]">
                        { (program?.program?.[0]?.specialization && program?.program?.[0]?.specialization.length > 0) ? program.program[0].specialization.map((spec) => spec).join(', '): "n/a"}
                    </div>
                </div>
                <div className="flex flex-row justify-start items-center">
                    <div className="max-sm:hidden w-[25%]">
                        Difficulty
                    </div>
                    <div className="w-[75%]">
                        { (program?.program?.[0]?.difficulty && program?.program?.[0]?.difficulty.length > 0) ? program.program[0].difficulty.map((diff) => diff).join(', '): "n/a"}
                    </div>
                </div>
            </div>
        </Card>
    );
};

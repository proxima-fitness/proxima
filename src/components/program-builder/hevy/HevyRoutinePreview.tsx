import { shortEnglishHumanizer } from "@/assets/constants";
import { Card } from "@/components/ui/card";

interface IProps {
    deflatHevyRoutine: THevyRoutine[][];
}

export const HevyRoutinePreview: React.FC<IProps> = (props) => {

    const {
        deflatHevyRoutine,
    } = props;

    return (
        <div className="flex flex-row max-sm:flex-col max-sm:w-screen max-h-screen overflow-auto sm:p-2 gap-4 border-t-4 border-lightGray dark:border-darkGray  pt-2">
            { deflatHevyRoutine.map((week, index) => (
                <div className="w-screen sm:w-full" key={ `Week ${index}` }>
                    <span className="bg-white p-2 font-main dark:bg-darkGray">Week {index + 1}</span>
                    { week.map((day) => (
                        <Card className="px-4 py-4 my-4 w-screen sm:min-w-[400px] sm:max-w-[400px] sm:w-[400px] bg-gray-100 dark:bg-extraDarkGray" key={ "week " + String(day.folder_id + 1) + "day " + day.order + " " }>
                            <div className="border-b-2 border-gray-200">
                                <div>
                                    <h3 className="font-main text-lg">{ "Day" } { day.order } { day?.title ? <> &middot; { day.title }</> : "" }</h3>
                                    <p className="font-extralight">{ day.exercises.length } {day.exercises.length === 1 ? "Exercise" : `Exercises`}</p>
                                </div>
                            </div>
                            <div className="flex flex-row justify-between gap-4 border-b-2 py-2 border-gray-200 text-sm">
                                <div className="flex flex-row gap-4 max-w-[50%]">
                                    <div>
                                        #
                                    </div>
                                    <div>
                                        Exercise
                                    </div>
                                </div>
                                <div className="flex flex-row justify-start min-w-[50%]">
                                    <div className="flex flex-row justify-center items-center min-w-[33%]">
                                        Sets
                                    </div>
                                    <div className="flex flex-row justify-center items-center min-w-[33%]">
                                        Reps
                                    </div>
                                    <div className="flex flex-row justify-center items-center min-w-[33%]">
                                        Intensity
                                    </div>
                                </div>

                            </div>
                            <div
                            >
                                { day?.exercises?.map((exercise: THevyExercise, exerciseIndex: number) => (
                                    <div key={ exerciseIndex }>
                                        <div className="border-b-2 text-sm border-gray-200 flex flex-row justify-between font-extralight items-center py-2">
                                            <div className="flex flex-row gap-4 max-w-[50%]">
                                                <div className="text-[#33bbcf]">{exerciseIndex + 1}</div>
                                                <div>
                                                    <div className="font-normal text-sm">{ exercise?.title }</div>
                                                </div>
                                                <div></div>
                                            </div>
                                            <div className="text-center flex flex-row justify-end items-center w-[50%] max-w-[50%] text-sm">
                                                <div className="min-w-[33%] flex flex-col justify-center items-center">
                                                    { exercise.sets.length }
                                                </div>
                                                <div className="min-w-[33%] flex flex-col justify-center items-center">
                                                    { exercise.sets[0] && exercise.sets[0].reps !== null && exercise.sets[0].reps > 0 && (
                                                        exercise.sets.every((reps, i, arr) => reps.reps === arr[0].reps) ? (
                                                            <div>{exercise.sets[0].reps}</div>
                                                        ) : (
                                                            exercise.sets.map((set, index) => (
                                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.reps }</div>
                                                            ))
                                                        )
                                                    )}
                                                    { exercise.sets[0] && exercise.sets[0].distance_meters !== null && exercise.sets[0].distance_meters > 0 && (
                                                        exercise.sets.every((reps, i, arr) => reps.distance_meters === arr[0].distance_meters) ? (
                                                            <div>{exercise.sets[0].distance_meters} m</div>
                                                        ) : (
                                                            exercise.sets.map((set, index) => (
                                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.distance_meters } m</div>
                                                            ))
                                                        )
                                                    )}
                                                    { exercise.sets[0] && exercise.sets[0].duration_seconds !== null && exercise.sets[0].duration_seconds > 0 && (
                                                        exercise.sets.every((reps, i, arr) => reps.duration_seconds === arr[0].duration_seconds) ? (
                                                            <div>{ shortEnglishHumanizer(exercise.sets[0].duration_seconds * 1000) } s</div>
                                                        ) : (
                                                            exercise.sets.map((set, index) => (
                                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.duration_seconds !== null && shortEnglishHumanizer(set.duration_seconds * 1000) } s</div>
                                                            ))
                                                        )
                                                    )}
                                                    { exercise.sets[0] && exercise.sets[0].custom_metric !== null && exercise.sets[0].custom_metric > 0 && (
                                                        exercise.sets.every((reps, i, arr) => reps.custom_metric === arr[0].custom_metric) ? (
                                                            <div>{exercise.sets[0].custom_metric}</div>
                                                        ) : (
                                                            exercise.sets.map((set, index) => (
                                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.custom_metric }</div>
                                                            ))
                                                        )
                                                    )}
                                                </div>
                                                <div className="min-w-[33%] flex flex-col justify-center items-center">
                                                    { exercise.sets[0] && exercise.sets[0].weight_kg !== null && exercise.sets[0].weight_kg > 0 && (
                                                        exercise.sets.every((intensity, i, arr) => intensity.weight_kg === arr[0].weight_kg) ? (
                                                            <div>{exercise.sets[0].weight_kg} kg</div>
                                                        ) : (
                                                            exercise.sets.map((set, index) => (
                                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.weight_kg } kg</div>
                                                            ))
                                                        )
                                                    )}
                                                    { exercise.sets[0] && exercise.sets[0].rpe !== null && exercise.sets[0].rpe > 0 && (
                                                        exercise.sets.every((intensity, i, arr) => intensity.rpe === arr[0].rpe) ? (
                                                            <div>{exercise.sets[0].rpe} RPE</div>
                                                        ) : (
                                                            exercise.sets.map((set, index) => (
                                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.rpe } RPE</div>
                                                            ))
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) ) }
                            </div>
                        </Card>
                    ) ) }
                </div>
            ) ) }
        </div>
    );
};

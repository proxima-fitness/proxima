import { shortEnglishHumanizer } from "@/assets/constants";
import { Card } from "../ui/card";

interface IProps {
    sortedWorkoutsByWeek: TScheduleWorkouts[][];
}

export const ProgramSchedule: React.FC<IProps> = (props) => {

    const {
        sortedWorkoutsByWeek,
    } = props;

    return (
        <div className="w-full pt-8">
            <div className="flex flex-row max-sm:flex-col w-full overflow-scroll p-2 gap-4">
                { sortedWorkoutsByWeek.map((week, index) => (
                    <div className="w-full" key={ `Week ${index}` }>
                        <span className="bg-white p-2 font-main">Week {index + 1}</span>
                        { week.map((day) => (
                            <Card className="px-4 py-4 my-4 w-[400px] max-sm:w-[355px] bg-gray-100" key={ "week " + day.nthWeek + "day " + day.nthDay + " " }>
                                <div className="border-b-2 border-gray-200">
                                    <div>
                                        <h3 className="font-main text-lg">{ "Day" } { day.nthDay } { day?.day_title ? <> &middot; { day.day_title }</> : "" }</h3>
                                        <p className="font-extralight">{ day.program_workout_exercises.length } {day.program_workout_exercises.length === 1 ? "Exercise" : `Exercises`}</p>
                                    </div>
                                </div>
                                <div className="flex flex-row justify-between gap-4 border-b-2 py-2 border-gray-200">
                                    <div className="flex flex-row gap-4 max-w-[50%]">
                                        <div>
                                            #
                                        </div>
                                        <div>
                                            Exercise
                                        </div>
                                    </div>
                                    <div className="flex flex-row justify-start gap-4 max-w-[50%]">
                                        <div>
                                            Sets
                                        </div>
                                        <div>
                                            Reps
                                        </div>
                                        <div>
                                            Intensity
                                        </div>
                                    </div>

                                </div>
                                <div
                                    className=""
                                    style={ {
                                        marginTop: "10px", marginBottom: "10px", borderRadius: "8px" } } slot="content">
                                    { day?.program_workout_exercises?.map((exercise: TAPIProgramWorkoutExercises, exerciseIndex: number) => (
                                        <div key={ exerciseIndex }>
                                            <div className="border-b-2 border-gray-200 flex flex-row justify-between font-extralight items-center py-2">
                                                <div className="flex flex-row gap-6 max-w-[50%]">
                                                    <div className="text-[#33bbcf]">{exerciseIndex + 1}</div>
                                                    <div>
                                                        <div className="font-normal text-sm">{ exercise?.exercises?.[`name_english`] }</div>
                                                    </div>
                                                    <div></div>
                                                </div>
                                                <div className="flex flex-row justify-start gap-6 max-w-[50%] text-sm">
                                                    <div>
                                                        { exercise?.reps && (
                                                            exercise.reps.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.reps.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.reps.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                            )}
                                                        { exercise?.reps_max && (
                                                            exercise.reps_max.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.reps_max.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.reps_max.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.time_taken && (
                                                            exercise.time_taken.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.time_taken.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.time_taken.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.amrap && (
                                                            exercise.amrap.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.amrap.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.amrap.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                            )}
                                                        { /* TODO: this exercise.time_range.length might cause a bug */ }
                                                        { exercise?.time_range && (
                                                            exercise.time_range.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.time_range.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.time_range.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                        )}
                                                        { /* TODO: this exercise.reps_range.length might cause a bug */ }
                                                        { exercise?.reps_range && (
                                                            exercise.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                `${exercise.reps_range.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.reps_range.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                        )}
                                                    </div>
                                                    <div>
                                                        { exercise?.amrap && "AMRAP" }
                                                        { exercise?.reps && (
                                                            exercise.reps.every((reps, i, arr) => reps === arr[0]) ? (
                                                                <div>{exercise.reps[0]} Reps</div>
                                                            ) : (
                                                                exercise.reps.map((repsNumber, index) => (
                                                                    <div key={ index }>{ repsNumber } Reps</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.reps_max && (
                                                            exercise.reps_max.every((reps, i, arr) => reps === arr[0]) ? (
                                                                <div>{">"} {exercise.reps_max[0]} Reps</div>
                                                            ) : (
                                                                exercise.reps_max.map((repsNumber, index) => (
                                                                    <div key={ index }>{">"} { repsNumber } Reps</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.reps_range && (
                                                            exercise.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                <div>{ exercise.reps_range[0][0]}-{exercise.reps_range[0][1] } Reps</div>
                                                            ) : (
                                                                exercise.reps_range.map((range, index) => (
                                                                    <div key={ index }>{range[0]} - {range[1]} Reps</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.time_taken && (
                                                            exercise.time_taken.every((reps, i, arr) => reps === arr[0]) ? (
                                                                <div>{shortEnglishHumanizer(exercise.time_taken[0] * 1000) }</div>
                                                            ) : (
                                                                exercise.time_taken.map((repsNumber, index) => (
                                                                    <div key={ index }>{shortEnglishHumanizer(repsNumber * 1000)}</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.time_range && (
                                                            exercise.time_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                <div>{ exercise.time_range[0][0]}-{exercise.time_range[0][1] } Reps</div>
                                                            ) : (
                                                                exercise.time_range.map((range, index) => (
                                                                    <div key={ index }>{range[0]} - {range[1]} Reps</div>
                                                                ))
                                                            )
                                                        )}
                                                    </div>
                                                    <div>
                                                        { exercise?.percent_rm && (
                                                            exercise.percent_rm.every((perVal, i, arr) => perVal === arr[0]) ? (
                                                                <div>{exercise.percent_rm[0]} %1RM</div>
                                                            ) : (
                                                                exercise.percent_rm.map((perVal, index) => (
                                                                    <div key={ index }>{perVal} %1RM</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.rpe && (
                                                            exercise.rpe.every((rpeVal, i, arr) => rpeVal === arr[0]) ? (
                                                                <div>{exercise.rpe[0]} RPE</div>
                                                            ) : (
                                                                exercise.rpe.map((rpeVal, index) => (
                                                                    <div key={ index }>{rpeVal} RPE</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.weights && (
                                                            exercise.weights.every((weightVal, i, arr) => weightVal === arr[0]) ? (
                                                                <div>{exercise.weights[0]} lbs</div>
                                                            ) : (
                                                                exercise.weights.map((weightVal, index) => (
                                                                    <div key={ index }>{ weightVal }lbs</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.rpe_range && (
                                                            exercise.rpe_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                <div>{ exercise.rpe_range[0][0]}-{exercise.rpe_range[0][1] } RPE</div>
                                                            ) : (
                                                                exercise.rpe_range.map((range, index) => (
                                                                    <div key={ index }>{range[0]} - {range[1]} RPE</div>
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
        </div>
    );
};

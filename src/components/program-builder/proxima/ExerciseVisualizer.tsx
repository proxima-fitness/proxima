
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NotebookTextIcon, Trash2Icon } from "lucide-react";
import { ExerciseGif } from "./ExerciseGif";

interface IProps {
    day: TProgramCreatorDay;
    weekOrder: string;
    handleEdit: (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: TProgramCreatorExercise) => void;
    handleDeleteExercise: (weekOrder: number, dayOrder: number, exerciseIndex: number) => void;
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: TDialog) => void;
}

export const ExerciseVisualizer: React.FC<IProps> = (props) => {

    const {
        day,
        weekOrder,
        handleDeleteExercise,
        handleEdit,
        handleOpenAddExerciseNoteDialog,
    } = props;

    return (
        <div>
            { day?.exercises?.map((exercise : TProgramCreatorExercise, i: number) => (
                <TooltipProvider key={ "Week" + (Number(weekOrder) + 1) + "Day" + i } delayDuration={ 0 }>
                    <Tooltip>
                        <TooltipTrigger asChild onClick={ () => handleEdit(Number(weekOrder), Number(day.order), i, exercise ) } className="w-full min-h-14">
                            <div className="flex flex-row justify-between items-center text-sm border-b-2 py-2 border-gray-200">
                                <div className="flex flex-row gap-2 items-center justify-start max-w-[50%]">
                                    <div className="text-lightSecondary pr-1">
                                        { i + 1}
                                    </div>
                                    <ExerciseGif thumbnailOrImage={ "thmb" } name={ exercise.exercise?.name_english ?? "" } gif_id={ exercise.exercise?.gif_id ?? "" } resolution={ "180" } file_type={ 'jpg' } />
                                    <div className="flex flex-row items-center justify-between">
                                        <div className="">
                                            { exercise.exercise?.name_english }
                                        </div>
                                        { exercise?.notes && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <NotebookTextIcon  className="h-4"/>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-lightSecondary text-white">
                                                { exercise?.notes }
                                                </TooltipContent>
                                            </Tooltip>
                                        ) }
                                    </div>

                                </div>
                                <div className="text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] h-full">
                                    { /* SETS */}
                                    <div className="min-w-[33%] flex flex-col justify-center items-center">
                                        { exercise.reps_type?.reps && (
                                            exercise.reps_type.reps.every((reps, i, arr) => reps === arr[0]) ? (
                                                `${exercise.sets}`
                                            ) : (
                                                Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                                    <div key={ index }>{index + 1}</div>
                                                ))
                                            )
                                            )}
                                        { exercise.reps_type?.reps_max && (
                                            exercise.reps_type.reps_max.every((reps, i, arr) => reps === arr[0]) ? (
                                                `${exercise.sets}`
                                            ) : (
                                                Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                                    <div key={ index }>{index + 1}</div>
                                                ))
                                            )
                                        )}
                                        { exercise.reps_type?.time_taken && (
                                            exercise.reps_type.time_taken.every((reps, i, arr) => reps === arr[0]) ? (
                                                `${exercise.sets}`
                                            ) : (
                                                Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                                    <div key={ index }>{index + 1}</div>
                                                ))
                                            )
                                        )}
                                        { exercise.reps_type?.amrap && (
                                            exercise.reps_type.amrap.every((reps, i, arr) => reps === arr[0]) ? (
                                                `${exercise.sets}`
                                            ) : (
                                                Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                                    <div key={ index }>{index + 1}</div>
                                                ))
                                            )
                                            )}
                                        { exercise.reps_type?.time_range && (
                                            exercise.reps_type.time_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                `${exercise.sets}`
                                            ) : (
                                                Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                                    <div key={ index }>{index + 1}</div>
                                                ))
                                            )
                                        )}
                                        { exercise.reps_type?.reps_range && (
                                            exercise.reps_type.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                `${exercise.sets}`
                                            ) : (
                                                Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                                    <div key={ index }>{index + 1}</div>
                                                ))
                                            )
                                        )}
                                    </div>
                                    { /* REPS */}
                                    <div className="min-w-[33%] flex flex-col justify-center items-center">
                                        { exercise.reps_type?.amrap && "AMRAP" }
                                        { exercise.reps_type?.reps && (
                                            exercise.reps_type.reps.every((reps, i, arr) => reps === arr[0]) && Array.isArray(exercise.sets_type) && exercise.sets_type.every((setType, i, arr) => setType === arr[0]) ? (
                                                <div>{exercise.reps_type.reps[0]}</div>
                                            ) : (
                                                exercise.reps_type.reps.map((repsNumber, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{ repsNumber }</div>
                                                ))
                                            )
                                        )}
                                        { exercise.reps_type?.reps_max && (
                                            exercise.reps_type.reps_max.every((reps, i, arr) => reps === arr[0]) && Array.isArray(exercise.sets_type) && exercise.sets_type.every((setType, i, arr) => setType === arr[0]) ? (
                                                <div>{">"} {exercise.reps_type.reps_max[0]}</div>
                                            ) : (
                                                exercise.reps_type.reps_max.map((repsNumber, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{">"} { repsNumber }</div>
                                                ))
                                            )
                                        )}
                                        { exercise.reps_type?.reps_range && (
                                            exercise.reps_type.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) && Array.isArray(exercise.sets_type) && exercise.sets_type.every((setType, i, arr) => setType === arr[0]) ? (
                                                <div>{ exercise.reps_type.reps_range[0][0]}-{exercise.reps_type.reps_range[0][1] }</div>
                                            ) : (
                                                exercise.reps_type.reps_range.map((range, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{range[0]} - {range[1]}</div>
                                                ))
                                            )
                                        )}
                                        { exercise.reps_type?.time_taken && (
                                            exercise.reps_type.time_taken.every((reps, i, arr) => reps === arr[0]) && Array.isArray(exercise.sets_type) && exercise.sets_type.every((setType, i, arr) => setType === arr[0]) ? (
                                                <div>{exercise.reps_type.time_taken[0]} s</div>
                                            ) : (
                                                exercise.reps_type.time_taken.map((repsNumber, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{ repsNumber } s</div>
                                                ))
                                            )
                                        )}
                                        { exercise.reps_type?.time_range && (
                                            exercise.reps_type.time_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) && Array.isArray(exercise.sets_type) && exercise.sets_type.every((setType, i, arr) => setType === arr[0]) ? (
                                                <div>{ exercise.reps_type.time_range[0][0]}-{exercise.reps_type.time_range[0][1] } s</div>
                                            ) : (
                                                exercise.reps_type.time_range.map((range, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{range[0]} - {range[1]} s</div>
                                                ))
                                            )
                                        )}
                                    </div>
                                    { /* INTENSITY */}
                                    <div className="min-w-[33%] flex flex-col justify-center items-center">
                                        { exercise.intensity?.percent_rm && (
                                            exercise.intensity.percent_rm.every((perVal, i, arr) => perVal === arr[0]) ? (
                                                <div>{ exercise.intensity.percent_rm[0]}% 1RM</div>
                                            ) : (
                                                exercise.intensity.percent_rm.map((perVal, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{perVal} % 1RM</div>
                                                ))
                                            )
                                        )}
                                        { exercise.intensity?.rpe && (
                                            exercise.intensity.rpe.every((rpeVal, i, arr) => rpeVal === arr[0]) ? (
                                                <div>{exercise.intensity.rpe[0]} RPE</div>
                                            ) : (
                                                exercise.intensity.rpe.map((rpeVal, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{rpeVal} RPE</div>
                                                ))
                                            )
                                        )}
                                        { exercise.intensity?.weights && (
                                            exercise.intensity.weights.every((weightVal, i, arr) => weightVal === arr[0]) ? (
                                                <div>{exercise.intensity.weights[0]} lbs</div>
                                            ) : (
                                                exercise.intensity.weights.map((weightVal, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{ weightVal } lbs</div>
                                                ))
                                            )
                                        )}
                                        { exercise.intensity?.rpe_range && (
                                            exercise.intensity.rpe_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                <div>{ exercise.intensity.rpe_range[0][0]}-{exercise.intensity.rpe_range[0][1] } RPE</div>
                                            ) : (
                                                exercise.intensity.rpe_range.map((range, index) => (
                                                    <div key={ index } className={ `${exercise?.sets_type?.[index] === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : exercise?.sets_type?.[index] === "dropset" ? "text-white bg-[#33bbcf] px-1 rounded-sm" : exercise?.sets_type?.[index] === "failure" ? "text-white bg-[#01579B] px-1 rounded-sm" : ""}` }>{range[0]} - {range[1]} RPE</div>
                                                ))
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-lightSecondary text-white flex flex-row gap-2">
                            <NotebookTextIcon
                                className="cursor-pointer"
                                    onClick={ () => handleOpenAddExerciseNoteDialog({weekOrder: Number(weekOrder), dayOrder: Number(day.order), exerciseIndex: i, isOpen: true}) }
                            />
                            <Trash2Icon
                                className="cursor-pointer"
                                onClick={ () => {
                                    handleDeleteExercise(Number(weekOrder), Number(day.order), i);
                                } } />
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) ) }
        </div>
    );
};

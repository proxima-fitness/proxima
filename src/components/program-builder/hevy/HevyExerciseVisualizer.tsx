import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getExerciseGifIdForHevyExercise } from "@/utils/helpers";
import { SquarePenIcon, Trash2Icon } from "lucide-react";
import { HevyExerciseGif } from "./HevyExerciseGif";
interface IProps {
    day: THevyRoutine;
    folder_id: number;
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
}

export const HevyExerciseVisualizer: React.FC<IProps> =  (props) => {

    const {
        day,
        folder_id,
        handleDeleteExercise,
    } = props;

    return (
        <div>
            { day?.exercises?.map((exercise : THevyExercise, i: number) => (
                <TooltipProvider key={ "Week" + (Number(folder_id) + 1) + "Day" + i } delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger className="w-full min-h-14">
                        <div className="flex flex-row justify-between items-center text-sm border-b-2 py-2 border-gray-200">
                            <div className="flex flex-row gap-2 items-center justify-start max-w-[50%]">
                                <div className="text-lightSecondary pr-1">
                                { i + 1}
                                </div>
                                <HevyExerciseGif thumbnailOrImage={ "thmb" } name={ exercise.title } resolution={ "180" } file_type={ 'jpg' } />
                                <div>{ exercise.title }</div>
                            </div>
                            <div className="text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] h-full">
                                <div className="min-w-[33%] flex flex-col justify-center items-center">
                                    { exercise.sets.length }

                                </div>
                                <div className="min-w-[33%] flex flex-col justify-center items-center">
                                    { exercise.sets[0] && exercise.sets[0].reps > 0 && (
                                        exercise.sets.every((reps, i, arr) => reps.reps === arr[0].reps) ? (
                                            <div>{exercise.sets[0].reps}</div>
                                        ) : (
                                            exercise.sets.map((set, index) => (
                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : ""}>{ set.reps }</div>
                                            ))
                                        )
                                    )}
                                    { exercise.sets[0] && exercise.sets[0].distance_meters > 0 && (
                                        exercise.sets.every((reps, i, arr) => reps.distance_meters === arr[0].distance_meters) ? (
                                            <div>{exercise.sets[0].distance_meters}</div>
                                        ) : (
                                            exercise.sets.map((set, index) => (
                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : ""}>{ set.distance_meters }m</div>
                                            ))
                                        )
                                    )}
                                    { exercise.sets[0] && exercise.sets[0].duration_seconds > 0 && (
                                        exercise.sets.every((reps, i, arr) => reps.duration_seconds === arr[0].duration_seconds) ? (
                                            <div>{exercise.sets[0].duration_seconds}</div>
                                        ) : (
                                            exercise.sets.map((set, index) => (
                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : ""}>{ set.duration_seconds }s</div>
                                            ))
                                        )
                                    )}
                                    { exercise.sets[0] && exercise.sets[0].custom_metric > 0 && (
                                        exercise.sets.every((reps, i, arr) => reps.custom_metric === arr[0].custom_metric) ? (
                                            <div>{exercise.sets[0].custom_metric}</div>
                                        ) : (
                                            exercise.sets.map((set, index) => (
                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : ""}>{ set.custom_metric }</div>
                                            ))
                                        )
                                    )}
                                </div>
                                <div className="min-w-[33%] flex flex-col justify-center items-center">
                                    { exercise.sets[0] && exercise.sets[0].weight_kg > 0 && (
                                        exercise.sets.every((intensity, i, arr) => intensity.weight_kg === arr[0].weight_kg) ? (
                                            <div>{exercise.sets[0].weight_kg}</div>
                                        ) : (
                                            exercise.sets.map((set, index) => (
                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : ""}>{ set.weight_kg } kg</div>
                                            ))
                                        )
                                    )}
                                    { exercise.sets[0] && exercise.sets[0].rpe > 0 && (
                                        exercise.sets.every((intensity, i, arr) => intensity.rpe === arr[0].rpe) ? (
                                            <div>{exercise.sets[0].rpe}</div>
                                        ) : (
                                            exercise.sets.map((set, index) => (
                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : ""}>{ set.rpe } RPE</div>
                                            ))
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-lightSecondary text-white flex flex-row gap-2">
                        <SquarePenIcon className="cursor-pointer" onClick={ () => {
                                // handleEdit(Number(weekOrder), Number(day.order), i, exercise )
                        } } />
                        <Trash2Icon
                            className="cursor-pointer"
                            onClick={ () => {
                                handleDeleteExercise(Number(folder_id), Number(day.order), i)
                            } }/>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
        ))}
        </div>
    );
};

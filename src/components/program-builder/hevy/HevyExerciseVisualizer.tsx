import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NotebookTextIcon, Trash2Icon } from "lucide-react";
import { HevyExerciseGif } from "./HevyExerciseGif";
interface IProps {
    day: THevyRoutine;
    folder_id: number;
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    handleEdit: (currentWeek: number, currentDay: number, exerciseIndex: number, editExercise: THevyExercise) => void;
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
}

export const HevyExerciseVisualizer: React.FC<IProps> =  (props) => {

    const {
        day,
        folder_id,
        handleEdit,
        handleDeleteExercise,
        handleOpenAddExerciseNoteDialog,
    } = props;

    return (
        <div>
            { day?.exercises?.map((exercise : THevyExercise, i: number) => (
                <TooltipProvider key={ "Week" + (Number(folder_id) + 1) + "Day" + i } delayDuration={ 0 }>
                    <Tooltip>
                        <TooltipTrigger asChild onClick={ () => handleEdit(folder_id, Number(day.order), i, exercise ) } className="w-full min-h-14">
                            <div className="flex flex-row justify-between items-center text-sm border-b-2 py-2 border-gray-200">
                                <div className="flex flex-row gap-2 items-center justify-start max-w-[50%]">
                                    <div className="text-lightSecondary pr-1">
                                        <span className="hidden sm:block">{ i + 1}</span>
                                        <Trash2Icon
                                            className="block sm:hidden"
                                            onClick={ (event) => {
                                                event.stopPropagation();
                                                handleDeleteExercise(Number(folder_id), Number(day.order), i)
                                            } }
                                        />
                                    </div>
                                    <HevyExerciseGif thumbnailOrImage={ "thmb" } name={ exercise.title } resolution={ "180" } file_type={ 'jpg' } />
                                    <div className="flex flex-row items-center justify-between">
                                        <div className="">
                                            { exercise.title }
                                        </div>
                                        { exercise.notes && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <NotebookTextIcon  className="h-4"/>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-lightSecondary text-white">
                                                { exercise.notes }
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                                <div className="text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] h-full">
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
                                            <div>{exercise.sets[0].duration_seconds} s</div>
                                        ) : (
                                            exercise.sets.map((set, index) => (
                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.duration_seconds } s</div>
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
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-lightSecondary text-white flex flex-row gap-2">
                            <NotebookTextIcon
                                className="cursor-pointer"
                                    onClick={ () => handleOpenAddExerciseNoteDialog({folder_id: Number(folder_id), dayOrder: Number(day.order), exerciseIndex: i, isOpen: true}) }
                            />
                            <Trash2Icon
                                className="cursor-pointer"
                                onClick={ () => {
                                    handleDeleteExercise(Number(folder_id), Number(day.order), i);
                                } } />
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
        ))}
        </div>
    );
};

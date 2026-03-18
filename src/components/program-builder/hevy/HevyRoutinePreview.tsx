"use client";

/**
 * @module HevyRoutinePreview
 * Read-only preview of the Hevy program: weeks and days as cards with exercise table (sets, reps, intensity).
 * Used when the builder is in preview mode (e.g. before save). Respects PoundsOrKg for weight display.
 * Depends on: Card, formatWeight/getWeightUnit, shortEnglishHumanizer.
 * Used by: HevyRoutine (when isPreview is true).
 */

import { shortEnglishHumanizer } from "@/assets/constants";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { formatWeight, getWeightUnit } from "@/lib/weightUtils";
import { Card } from "@/components/ui/card";

/** Props for the read-only program preview. */
interface IProps {
    /** Program as weeks (outer array) and days per week (inner array); de-flattened from flat hevyProgram. */
    deflatHevyRoutine: THevyRoutine[][];
}

/**
 * Renders the full program in read-only form: week sections and day cards with exercise rows (sets/reps/intensity).
 */
export const HevyRoutinePreview: React.FC<IProps> = (props) => {

    const {
        deflatHevyRoutine,
    } = props;

    const { isInLbs } = usePoundsOrKgContext();

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
                                    <p className="font-light">{ day.exercises.length } {day.exercises.length === 1 ? "Exercise" : `Exercises`}</p>
                                </div>
                            </div>
                            <div className="flex flex-row justify-between gap-4 border-b-2 py-2 border-gray-200 text-sm dark:text-offWhite">
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
                                        <div className="border-b-2 text-sm border-gray-200 flex flex-row justify-between font-light items-center py-2 dark:border-offWhite dark:text-offWhite">
                                            <div className="flex flex-row gap-4 max-w-[50%]">
                                                <div className="text-[#33bbcf] dark:white">{exerciseIndex + 1}</div>
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
                                                            <div>{formatWeight(exercise.sets[0].weight_kg, isInLbs, "kg")} {getWeightUnit(isInLbs)}</div>
                                                        ) : (
                                                            exercise.sets.map((set, index) => (
                                                                <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ formatWeight(set.weight_kg ?? 0, isInLbs, "kg") } {getWeightUnit(isInLbs)}</div>
                                                            ))
                                                        )
                                                    )}
                                                    { exercise.sets.some((set) => set.rpe != null && set.rpe > 0) && (
                                                        (() => {
                                                            const rpeValues = exercise.sets.map((s) => s.rpe).filter((r): r is number => r != null && r > 0);
                                                            const allSameRpe = rpeValues.length > 0 && rpeValues.every((v) => v === rpeValues[0]);
                                                            return allSameRpe ? (
                                                                <div>{rpeValues[0]} RPE</div>
                                                            ) : (
                                                                exercise.sets.map((set, index) => (
                                                                    <div key={ index } className={ set.type === "warmup" ? "text-white bg-gray-300 px-1 rounded-sm" : "" }>{ set.rpe != null && set.rpe > 0 ? `${set.rpe} RPE` : "" }</div>
                                                                ))
                                                            );
                                                        })()
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

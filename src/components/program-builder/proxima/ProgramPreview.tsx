"use client";

import { useState, useEffect, useRef } from "react";
import { shortEnglishHumanizer } from "@/assets/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface IProps {
    sortedWorkoutsByWeek: TScheduleWorkouts[][];
}

export const ProgramPreview: React.FC<IProps> = (props) => {

    const {
        sortedWorkoutsByWeek,
    } = props;

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Update scroll button visibility based on scroll position
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const updateScrollButtons = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        };

        updateScrollButtons();
        container.addEventListener('scroll', updateScrollButtons);
        window.addEventListener('resize', updateScrollButtons);

        return () => {
            container.removeEventListener('scroll', updateScrollButtons);
            window.removeEventListener('resize', updateScrollButtons);
        };
    }, [sortedWorkoutsByWeek.length]);

    const handleScrollLeft = () => {
        if (scrollContainerRef.current) {
            // Each week card is approximately 400px wide + 16px gap (gap-4)
            const scrollAmount = 416;
            scrollContainerRef.current.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleScrollRight = () => {
        if (scrollContainerRef.current) {
            // Each week card is approximately 400px wide + 16px gap (gap-4)
            const scrollAmount = 416;
            scrollContainerRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="w-full dark:bg-darkGray relative">
            <div
                ref={scrollContainerRef}
                className="flex flex-row max-sm:flex-col w-full overflow-scroll max-sm:p-0 p-2 gap-4"
            >
                { sortedWorkoutsByWeek.map((week, index) => (
                    <div className="w-full" key={ `Week ${index}` }>
                        <span className="bg-white dark:bg-darkGray p-2 font-main">Week {index + 1}</span>
                        { week.map((day) => (
                            <Card className="px-4 py-4 my-4 min-w-[400px] max-w-[400px] w-[400px] max-sm:min-w-[99%] max-sm:max-w-[99%] max-sm:w-[99%] bg-gray-100 dark:bg-extraDarkGray" key={ "week " + day.nthWeek + "day " + day.nthDay + " " }>
                                <div className="border-b-2 border-gray-200">
                                    <div>
                                        <h3 className="font-main text-lg">{ "Day" } { day.nthDay } { day?.day_title ? <> &middot; { day.day_title }</> : "" }</h3>
                                        <p className="font-extralight dark:text-offWhite">{ day.program_workout_exercises.length } {day.program_workout_exercises.length === 1 ? "Exercise" : `Exercises`}</p>
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
                                    className="my-4 rounded-xl dark:text-offWhite"
                                >
                                    { day?.program_workout_exercises?.map((exercise: TSavedWorkoutExercise, exerciseIndex: number) => (
                                        <div key={ exerciseIndex }>
                                            <div className="border-b-2 dark:border-offWhite text-sm border-gray-200 flex flex-row justify-between font-light items-center py-2">
                                                <div className="flex flex-row gap-4 max-w-[50%]">
                                                    <div className="text-lightSecondary font-bold">{exerciseIndex + 1}</div>
                                                    <div>
                                                        <div className="font-third font-normal text-sm dark:text-extraLightGray">{ exercise?.hevy_exercise_templates?.title }</div>
                                                    </div>
                                                    <div></div>
                                                </div>
                                                <div className="text-center flex flex-row justify-end items-center w-[50%] max-w-[50%] text-sm">
                                                    <div className="min-w-[33%] flex flex-col justify-center items-center">
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
                                                        { exercise?.time_range && (
                                                            exercise.time_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                `${exercise.time_range.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.time_range.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                        )}
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
                                                    <div className="min-w-[33%] flex flex-col justify-center items-center">
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
                                                                <div>{ exercise.time_range[0][0]}-{exercise.time_range[0][1] } Secs</div>
                                                            ) : (
                                                                exercise.time_range.map((range, index) => (
                                                                    <div key={ index }>{range[0]} - {range[1]} Secs</div>
                                                                ))
                                                            )
                                                        )}
                                                    </div>
                                                    <div className="min-w-[33%] flex flex-col justify-center items-center">
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
            {/* Left Arrow Button */}
            {canScrollLeft && (
                <Button
                    onClick={handleScrollLeft}
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white dark:bg-lightSecondary dark:hover:bg-lightSecondary shadow-lg border-2 h-12 w-12 rounded-full transition-opacity flex items-center justify-center p-0 max-sm:hidden"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
            )}
            {/* Right Arrow Button */}
            {canScrollRight && (
                <Button
                    onClick={handleScrollRight}
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white dark:bg-lightSecondary dark:hover:bg-lightSecondary shadow-lg border-2 h-12 w-12 rounded-full transition-opacity flex items-center justify-center p-0 max-sm:hidden"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            )}
        </div>
    );
};

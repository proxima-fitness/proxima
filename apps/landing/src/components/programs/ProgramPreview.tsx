"use client";

import { useState, useLayoutEffect, useRef } from "react";
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
    /** Optimistic until measured: multi-week row usually overflows on sm+ (arrows are max-sm:hidden). */
    const [canScrollRight, setCanScrollRight] = useState(
        () => sortedWorkoutsByWeek.length > 1,
    );

    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const EPS = 1;

        const update = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            const maxScroll = Math.max(0, scrollWidth - clientWidth);
            const overflow = scrollWidth > clientWidth + EPS;
            setCanScrollLeft(scrollLeft > EPS);
            setCanScrollRight(overflow && scrollLeft < maxScroll - EPS);
        };

        let cancelled = false;
        update();
        const rafOuter = requestAnimationFrame(() => {
            if (cancelled) return;
            update();
            requestAnimationFrame(() => {
                if (cancelled) return;
                update();
            });
        });

        container.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        const ro = new ResizeObserver(() => {
            update();
        });
        ro.observe(container);

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafOuter);
            container.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
            ro.disconnect();
        };
    }, [sortedWorkoutsByWeek.length]);

    const handleScrollLeft = () => {
        if (scrollContainerRef.current) {
            // ~400px card + gap-5 (20px)
            const scrollAmount = 420;
            scrollContainerRef.current.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleScrollRight = () => {
        if (scrollContainerRef.current) {
            const scrollAmount = 420;
            scrollContainerRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="w-full">
            <p className="mb-4 font-third text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Schedule preview
            </p>
            <div className="relative z-0 w-full overflow-visible">
            <div
                ref={scrollContainerRef}
                className="scrollbar-thin flex w-full min-w-0 flex-row gap-5 overflow-x-auto overflow-y-visible pb-2 max-sm:flex-col max-sm:p-0 sm:px-0"
            >
                { sortedWorkoutsByWeek.map((week, index) => (
                    <div
                        className="flex w-full min-w-0 flex-col sm:max-w-[400px] sm:min-w-[400px] sm:shrink-0"
                        key={ `Week ${index}` }
                    >
                        <span className="mb-2 inline-flex rounded-full bg-muted/90 px-3 py-1 font-third text-xs font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border/50">
                            Week {index + 1}
                        </span>
                        { week.map((day) => (
                            <Card className="my-3 min-w-[400px] max-w-[400px] w-[400px] max-sm:min-w-[99%] max-sm:max-w-[99%] max-sm:w-[99%] rounded-2xl border-0 bg-card/90 px-5 py-5 shadow-none backdrop-blur-sm dark:border dark:border-white/10 dark:bg-card/50" key={ "week " + day.nthWeek + "day " + day.nthDay + " " }>
                                <div className="border-b border-black/5 pb-3 dark:border-white/10">
                                    <div>
                                        <h3 className="font-third text-lg font-semibold tracking-tight text-foreground">
                                            Day { day.nthDay }{ day?.day_title ? <> · { day.day_title }</> : "" }
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            { day.program_workout_exercises.length }{day.program_workout_exercises.length === 1 ? " exercise" : " exercises"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-row justify-between gap-4 border-b border-black/5 py-3 text-sm text-muted-foreground dark:border-white/10">
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
                                <div className="my-2 divide-y divide-black/5 rounded-xl text-foreground dark:divide-white/10">
                                    { day?.program_workout_exercises?.map((exercise: TSavedWorkoutExercise, exerciseIndex: number) => (
                                        <div key={ exerciseIndex }>
                                            <div className="flex flex-row items-center justify-between py-2.5 text-sm font-normal">
                                                <div className="flex max-w-[50%] flex-row gap-4">
                                                    <div className="font-semibold text-secondary dark:text-lightSecondary">{exerciseIndex + 1}</div>
                                                    <div>
                                                        <div className="font-third text-sm text-foreground">{ exercise?.hevy_exercise_templates?.title }</div>
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
                                                                <div>{ exercise.reps_range[0]?.[0]}-{exercise.reps_range[0]?.[1] } Reps</div>
                                                            ) : (
                                                                exercise.reps_range.map((range, index) => (
                                                                    <div key={ index }>{range?.[0]} - {range?.[1]} Reps</div>
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
                    className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 text-white bg-lightSecondary p-0 shadow-md backdrop-blur-sm transition-opacity hover:bg-lightSecondary/90 hover:text-white max-sm:hidden"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            )}
            {/* Right Arrow Button */}
            {canScrollRight && (
                <Button
                    onClick={handleScrollRight}
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center hover:text-white justify-center rounded-full border border-border/60 text-white bg-lightSecondary p-0 shadow-md backdrop-blur-sm transition-opacity hover:bg-lightSecondary/90 max-sm:hidden"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            )}
            </div>
        </div>
    );
};

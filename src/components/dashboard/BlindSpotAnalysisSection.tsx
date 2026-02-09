"use client";

import { useUserContext } from "@/contexts/UserContext";
import { useExerciseStallsAnalysis } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseStalls, type IExercise } from "./ExerciseStalls";

const DEFAULT_EXERCISES: IExercise[] = [
    { name: "Bench Press (Barbell)", weight: 0, color: "green", trend: Array(15).fill(0), hasStall: false, sessions: [] },
    { name: "Squat (Barbell)", weight: 0, color: "green", trend: Array(15).fill(0), hasStall: false, sessions: [] },
    { name: "Deadlift (Barbell)", weight: 0, color: "green", trend: Array(15).fill(0), hasStall: false, sessions: [] },
];

export function BlindSpotAnalysisSection() {
    const { user } = useUserContext();
    const { data: exerciseStallsData, isLoading: isLoadingExerciseStalls } = useExerciseStallsAnalysis(user);

    const handlePaywallOpen = () => {};

    return (
        <section className="pt-10 pb-12">
            <h2 className="text-2xl font-main mb-6 text-black dark:text-white">
                Blind Spot Analysis ({exerciseStallsData?.length ?? 3})
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                A smoke check for your lifts. Explore fixes for any exercises that are not progressing.
            </p>
            {isLoadingExerciseStalls ? (
                <div className="pt-5 w-full max-w-full overflow-hidden px-0 box-border">
                    <div className="flex justify-between items-center mb-3 w-full max-w-full box-border">
                        <Skeleton className="h-3.5 w-2/5 flex-1 min-w-0" />
                        <Skeleton className="h-3 w-1/3 shrink-0" />
                    </div>
                    <div className="flex flex-col gap-3 w-full max-w-full box-border">
                        {[1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="p-4 rounded-lg bg-card flex justify-between items-center w-full box-border"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Skeleton className="w-3 h-3 rounded-full shrink-0" />
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <Skeleton className="h-4 w-[60%]" />
                                        <Skeleton className="h-[18px] w-[40%]" />
                                    </div>
                                </div>
                                <Skeleton className="w-[60px] h-8 shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <ExerciseStalls
                    exercises={exerciseStallsData ?? DEFAULT_EXERCISES}
                    onExploreFixes={() => {}}
                    onViewMore={handlePaywallOpen}
                />
            )}
        </section>
    );
}

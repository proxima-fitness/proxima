export function convertSupabaseDateToReadable(inputDate: string | undefined): string {

    let formattedDate = "";
    if (inputDate) {
        const date = new Date(inputDate);
        const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
        formattedDate = date.toLocaleDateString('en-US', options);
    }

    return formattedDate;
}

export const sortWorkouts = (scheduleWorkouts: TScheduleWorkouts[]) => {
    const workoutsByWeek = scheduleWorkouts.reduce<Record<number, TScheduleWorkouts[]>>((acc, workout) => {
        const { nthWeek } = workout;
        if (!acc[nthWeek]) {
            acc[nthWeek] = [];
        }
        acc[nthWeek].push(workout);
        return acc;
    }, {});

    const sortedWorkoutsByWeek: TScheduleWorkouts[][] = Object.keys(workoutsByWeek)
        .sort((a, b) => Number(a) - Number(b))
        .map(week =>
            workoutsByWeek[Number(week)].sort((a, b) => a.nthDay - b.nthDay),
    );

    return sortedWorkoutsByWeek;
};

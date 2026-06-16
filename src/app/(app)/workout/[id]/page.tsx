/**
 * @module (app)/workout/[id]/page
 *
 * Logged workout detail route. Client-only fetch via WorkoutDetailContent.
 * Route: /workout/{id} ({id} = backup workouts.id).
 *
 * Depends on: WorkoutDetailContent
 * Used by: Next.js (route "/workout/[id]")
 */

import { WorkoutDetailContent } from "./WorkoutDetailContent";

export const metadata = {
    title: "Workout | Proxima Fitness",
    description: "View your logged workout",
};

/**
 * Workout detail page shell — delegates to client content.
 *
 * @param props.params - Dynamic route segment (backup workout id)
 */
export default async function WorkoutDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <WorkoutDetailContent workoutId={id} />;
}

// SPDX-License-Identifier: AGPL-3.0-only

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
 * Workout detail page shell - delegates to client content.
 *
 * @param props.params - Dynamic route segment (backup workout id)
 */
export default async function WorkoutDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string; returnQs?: string; chat?: string }>;
}) {
    const { id } = await params;
    const { from, returnQs, chat } = await searchParams;
    return (
        <WorkoutDetailContent
            workoutId={id}
            returnFrom={from}
            returnQs={returnQs}
            returnChatId={chat}
        />
    );
}

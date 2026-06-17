/**
 * @module (app)/workout/[id]/not-found
 *
 * Dedicated 404 for missing or unowned backup workouts.
 */

import { Card } from "@/components/ui/card";
import styles from "@/style";
import { WorkoutNotFoundBackLink } from "./WorkoutDetailBackLink";

/** 404 when workout id is invalid or not owned by the current user. */
export default function WorkoutNotFound() {
    return (
        <div className={`min-h-[50vh] bg-muted/30 py-8 max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24 ${styles.flexCenter}`}>
            <Card className="max-w-md rounded-2xl border border-border/60 px-6 py-12 text-center shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight">Workout not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    This workout does not exist or you do not have access to it.
                </p>
                <WorkoutNotFoundBackLink />
            </Card>
        </div>
    );
}

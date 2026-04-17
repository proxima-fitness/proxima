/**
 * @module (app)/programs/page
 *
 * Programs index page. Wraps ProgramsLayout in Suspense with ProgramsFallback.
 * Sits at src/app/(app)/programs/page.tsx; route "/programs".
 *
 * Depends on: ProgramsLayout, ProgramsFallback, styles.
 * Used by: Next.js (route "/programs").
 */

import ProgramsLayout from "@/components/programs/ProgramsLayout";
import styles from "../../../style";
import { Suspense } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";

export const metadata = {
    title: "Explore Programs | Proxima Fitness",
    description: "Explore and search from a list of Free Workout Programs on Proxima",
};

/** Programs index; list/grid with fallback. */
export default function ProgramsPage() {
    return (
        <div className={ `bg-background max-sm:px-3 ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <Suspense fallback={ <ProgramsFallback /> }>
                    <ProgramsLayout />
                </Suspense>
            </div>
        </div>
    );
}

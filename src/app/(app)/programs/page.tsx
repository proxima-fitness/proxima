import ProgramsLayout from "@/components/programs/ProgramsLayout";
import styles from "../../../style";
import { Suspense } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";

export const metadata = {
    title: "Explore Programs | Proxima Fitness",
    description: "Explore and search from a list of Free Workout Programs on Proxima",
};

export default function ProgramsPage() {

    return (
        <div className={ `bg-white dark:bg-extraDarkGray ${styles.paddingX} ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <Suspense fallback={ <ProgramsFallback /> }>
                    <ProgramsLayout />
                </Suspense>
            </div>
        </div>
    );
}

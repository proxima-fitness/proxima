import { MyProgramsVault } from "@/components/programs/MyProgramsVault";
import { BlindSpotAnalysisSection } from "@/components/dashboard/BlindSpotAnalysisSection";
import styles from "../../../style";
import { Suspense } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";

export const metadata = {
    title: "My Dashboard | Proxima Fitness",
    description: "Your dashboard: saved programs and blind spot analysis",
};

export default function DashboardPage() {
    return (
        <div className={`bg-white dark:bg-extraDarkGray ${styles.paddingX} ${styles.flexCenter} flex-col`}>
            <div className={`${styles.boxWidth}`}>
                <BlindSpotAnalysisSection />
                <Suspense fallback={<ProgramsFallback />}>
                    <MyProgramsVault />
                </Suspense>
            </div>
        </div>
    );
}

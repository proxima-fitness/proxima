import { MyProgramsVault } from "@/components/programs/MyProgramsVault";
import { BlindSpotAnalysisSection } from "@/components/dashboard/BlindSpotAnalysisSection";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";
import { ResumeDraftBanner } from "@/components/program-builder/ResumeDraftBanner";
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
                <div className="flex items-center justify-center pt-8">
                    <ResumeDraftBanner />
                </div>
                <BlindSpotAnalysisSection />
                <HevyProgramsGrid />
                <Suspense fallback={<ProgramsFallback />}>
                    <MyProgramsVault />
                </Suspense>
            </div>
        </div>
    );
}

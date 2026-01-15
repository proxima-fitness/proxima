import { MyProgramsVault } from "@/components/programs/MyProgramsVault";
import styles from "../../../style";
import { Suspense } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";

export const metadata = {
    title: "My Programs Vault | Proxima Fitness",
    description: "View and manage your saved workout programs in your secure Vault",
};

export default function MyProgramsPage() {

    return (
        <div className={`bg-white dark:bg-extraDarkGray ${styles.paddingX} ${styles.flexCenter} flex-col`}>
            <div className={`${styles.boxWidth}`}>
                <Suspense fallback={<ProgramsFallback />}>
                    <MyProgramsVault />
                </Suspense>
            </div>
        </div>
    );
}

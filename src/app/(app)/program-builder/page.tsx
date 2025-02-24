/* eslint-disable @typescript-eslint/no-explicit-any */

import { AiSearchDialog } from "@/components/program-builder/AiSearchDialog";
import styles from "@/style";

export const metadata = {
    title: "AI Program Builder | Proxima Fitness",
    description: "Generate a custom program with AI. Build your ideal program fast.",
  };

  export default function AiProgramBuilder() {
    return (
        <div className={ `bg-white ${styles.paddingX} ${styles.flexCenter} flex-col` }>
        <div className={ `${styles.boxWidth}` }>
            <AiSearchDialog />
        </div>
    </div>

    );
}

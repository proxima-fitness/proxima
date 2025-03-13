/* eslint-disable @typescript-eslint/no-explicit-any */
import { AiSearchDialog } from "@/components/program-builder/AiSearchDialog";
import styles from "@/style";
import { MessageSquareWarningIcon } from "lucide-react";

export const metadata = {
    title: "AI Program Builder | Proxima Fitness",
    description: "Generate a custom program with AI. Build your ideal program fast.",
  };

  export default function AiProgramBuilder() {
    return (
        <div className={ `bg-white ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <AiSearchDialog />
                <div className="bg-red-400 py-4 text-white hidden max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:items-center text-center">
                    <MessageSquareWarningIcon />
                    Please use on a desktop computer for best experience
                </div>
            </div>
        </div>

    );
}

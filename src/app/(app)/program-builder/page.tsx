/* eslint-disable @typescript-eslint/no-explicit-any */
import { AiSearchDialog } from "@/components/program-builder/AiSearchDialog";
import styles from "@/style";
import { MessageSquareWarningIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
    title: "AI Program Builder | Proxima Fitness",
    description: "Generate a custom program with AI. Build your ideal program fast.",
  };

  export default function AiProgramBuilder() {
    return (
        <div className={ `bg-white ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <div className="flex flex-row max-sm:flex-col max-sm:gap-0 items-center justify-center gap-12">
                    <AiSearchDialog />
                    or
                    <Link
                        target="_self"
                        rel="noopener noreferrer"
                        href={ `/program-builder/build-program?empty=true` }
                    >
                    <Button variant="ghost" className="xl:my-[450px] max-sm:my-24 lg:my-[250px] h-[60px] rounded-xl w-[200px font-main uppercase flex items-center justify-center gap-4">
                        empty template
                    </Button>
                    </Link>
                </div>
                <div className="bg-red-400 py-4 text-white hidden max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:items-center text-center">
                    <MessageSquareWarningIcon />
                    Please use on a desktop computer for best experience
                </div>
            </div>
        </div>

    );
}

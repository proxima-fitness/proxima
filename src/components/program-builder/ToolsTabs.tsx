import { RotateCcwIcon } from "lucide-react";
import Link from "next/link";

export const ToolsTabs: React.FC = () => {

    return (
        <>
            {/* <div className="max-sm:hidden cursor-pointer text-sm flex flex-row justify-center items-center gap-2 pr-4">
                Rebuild
                <SparklesIcon size="16" />
            </div> */}
            <Link href={ `/program-builder` }>
                <div className="max-sm:hidden cursor-pointer text-sm flex flex-row justify-center items-center gap-2">
                    Reset
                    <RotateCcwIcon size="16" />
                </div>
            </Link>
        </>
    );
};

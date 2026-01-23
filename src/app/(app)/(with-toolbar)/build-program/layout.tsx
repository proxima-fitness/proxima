import { Breadcrumbs } from "@/components/program-builder/shared/Breadcrumbs";
import { ReactNode, Suspense } from "react";
import { StepButton } from "@/components/program-builder/shared/StepButton";
import { Badge } from "@/components/ui/badge";

export default function ProgramBuilderLayout({ children }: { children: ReactNode }) {
    return (
        <div>
            <div className="sticky top-0 z-50 p-2 bg-extraLightGray dark:bg-extraDarkGray border-b-2 dark:border-darkGray border-white flex flex-row items-center justify-between text-xl text-black dark:text-white relative">
                <Breadcrumbs />
                {/* <ProgramBuilderTabs /> */}

                {/* Set Types - Centered on desktop only */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2">
                    <Badge variant="outline" className="bg-gray-300 dark:text-black border-none text-xs gap-2 justify-start">
                        Warmup
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-2 justify-start">
                         Working
                    </Badge>
                    <Badge
                        variant="outline"
                        className="bg-[#33bbcf] text-white border-none text-xs gap-2 justify-start"
                    >
                         Drop
                    </Badge>
                    <Badge
                        variant="outline"
                        className="bg-[#01579B] text-white border-none text-xs gap-2 justify-start"
                    >
                         Failure
                    </Badge>
                </div>

                <div className="flex flex-row items-center justify-between gap-4 max-sm:ml-auto">
                    {/* <ToolsTabs /> */}
                    <Suspense fallback={null}>
                        <StepButton />
                    </Suspense>
                </div>
            </div>
            {children}
        </div>

    );
};


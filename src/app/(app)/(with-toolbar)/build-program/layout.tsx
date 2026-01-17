import { Breadcrumbs } from "@/components/program-builder/shared/Breadcrumbs";
import { ReactNode, Suspense } from "react";
import { StepButton } from "@/components/program-builder/shared/StepButton";

export default function ProgramBuilderLayout({ children }: { children: ReactNode }) {
    return (
        <div>
            <div className="sticky top-0 z-50 p-2 bg-extraLightGray dark:bg-extraDarkGray border-b-2 dark:border-darkGray border-white flex flex-row items-center justify-between text-xl text-black dark:text-white">
                <Breadcrumbs />
                {/* <ProgramBuilderTabs /> */}
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


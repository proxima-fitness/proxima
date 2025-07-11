import { Breadcrumbs } from "@/components/program-builder/shared/Breadcrumbs";
// import { ProgramBuilderTabs } from "@/components/program-builder/shared/ProgramBuilderTabs";
import { StepButton } from "@/components/program-builder/shared/StepButton";
import { ToolsTabs } from "@/components/program-builder/shared/ToolsTabs";
import { Suspense } from "react";

export default async function ProgramBuilderLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <div>
            <div className="sticky top-0 z-50 p-2 bg-extraLightGray border-b flex flex-row items-center justify-between text-xl text-black">
                <Breadcrumbs />
                {/* <ProgramBuilderTabs /> */}
                <div className="flex flex-row items-center justify-between gap-4">
                    <ToolsTabs />
                    <Suspense fallback={null}>
                        <StepButton />
                    </Suspense>
                </div>

            </div>
            {children}
        </div>
    );
}

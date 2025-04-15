import { Breadcrumbs } from "@/components/program-builder/Breadcrumbs";
import { ProgramBuilderTabs } from "@/components/program-builder/ProgramBuilderTabs";
import { StepButton } from "@/components/program-builder/StepButton";
import { ToolsTabs } from "@/components/program-builder/ToolsTabs";

export default async function ProgramBuilderLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <div>
            <div className="sticky top-0 z-50 border-b-4 border-gray-300 p-2 bg-white flex flex-row items-center justify-between text-xl text-black">
                <Breadcrumbs />
                <ProgramBuilderTabs />
                <ToolsTabs />
                <StepButton />
            </div>
            {children}
        </div>
    );
}

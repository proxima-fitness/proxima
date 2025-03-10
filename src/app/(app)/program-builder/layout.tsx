import { Breadcrumbs } from "@/components/program-builder/Breadcrumbs";
import { ProgramBuilderTabs } from "@/components/program-builder/ProgramBuilderTabs";
import { StepButton } from "@/components/program-builder/StepButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsHevy } from "@/contexts/HevyContext";
import { RotateCcwIcon } from "lucide-react";
import Link from "next/link";

export default async function ProgramBuilderLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <div>
            <div className="p-2 bg-lightGray flex flex-row items-center justify-between text-xl text-black">
                <Breadcrumbs />
                <ProgramBuilderTabs />
                <Link href={ `/program-builder` }>
                    <div className="cursor-pointer text-sm flex flex-row justify-center items-center gap-2">
                        Retry
                        <RotateCcwIcon size="16" />
                    </div>
                </Link>
                <StepButton />
            </div>
            {children}
        </div>
    );
}

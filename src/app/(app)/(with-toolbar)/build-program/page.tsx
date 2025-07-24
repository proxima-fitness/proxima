import { BuildProgramPage } from "@/components/program-builder/shared/BuildProgramPage";
import { BuildProgramSkeletonSSR } from "@/components/program-builder/shared/BuildProgramSkeletonSSR";
import { Suspense } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";
import { RePrompt } from "@/components/program-builder/shared/RePrompt";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default function BuildProgram() {

    return (
        <div className={ `bg-white dark:bg-darkGray max-h-screen` }>

            <Suspense fallback={ <BuildProgramSkeletonSSR /> }>
                <div className="max-sm:hidden sm:block">
                    <ResizablePanelGroup
                        direction="horizontal"
                    >
                    <ResizablePanel defaultSize={20} minSize={20} maxSize={70} className="border-extraLightGray bg-extraLightGray dark:bg-extraDarkGray dark:text-white">
                        <RePrompt />
                    </ResizablePanel>
                    <ResizableHandle withHandle className="" />
                    <ResizablePanel defaultSize={70}>
                        <BuildProgramPage />
                    </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
                <div className="max-sm:block sm:hidden">
                        <BuildProgramPage />
                </div>
            </Suspense>
        </div>
    );
}

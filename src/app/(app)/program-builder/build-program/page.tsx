import { BuildProgramPage } from "@/components/program-builder/shared/BuildProgramPage";
import { BuildProgramSkeletonSSR } from "@/components/program-builder/shared/BuildProgramSkeletonSSR";
import { Suspense } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";
import { RePrompt } from "@/components/program-builder/shared/RePrompt";
import { Button } from "@/components/ui/button";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default async function BuildProgram() {

    return (
        <div className={ `bg-white overflow-x-scroll` }>
            <Suspense fallback={ <BuildProgramSkeletonSSR /> }>
                <ResizablePanelGroup
                    direction="horizontal"
                >
                <ResizablePanel className="min-w-74" defaultSize={30}>
                    <div className="min-h-12 p-2 border-b flex flex-row gap-2">
                        <Button variant="default" className="bg-lightGray text-black hover:bg-lightGray">Chat</Button>
                        <Button variant="ghost" className="text-black hover:bg-lightGray">Filters</Button>
                    </div>
                    <div className="flex flex-col justify-end items-end">
                        <RePrompt />
                    </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={70}>
                    <BuildProgramPage />
                </ResizablePanel>
                </ResizablePanelGroup>
            </Suspense>
        </div>
    );
}

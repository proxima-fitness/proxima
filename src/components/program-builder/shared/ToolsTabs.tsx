"use client";

import { ArrowUpIcon, MicIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { SquarePenIcon } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { ScrollArea } from "@/components/ui/scroll-area";

export const ToolsTabs: React.FC = () => {

    const [aiEditorOpen, setAiEditorOpen] = useState(false);
    const [dropzoneOpen, toggleDropzone] = useReducer(prev => !prev, false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
                event.preventDefault();
                setAiEditorOpen(true);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const props = useSupabaseUpload({
        bucketName: 'test',
        path: 'test',
        allowedMimeTypes: ['image/*'],
        maxFiles: 2,
        maxFileSize: 1000 * 1000 * 10, // 10MB,
    });

    return (
        <>
            <Sheet open={ aiEditorOpen } onOpenChange={ () => setAiEditorOpen(false) }>
                {/* <div className="max-sm:hidden cursor-pointer text-sm flex flex-row gap-2 pr-4" onClick={ () => setAiEditorOpen(true) }>
                    Edit
                    <SparklesIcon size="16" />
                </div> */}
                <SheetContent side="left" className="flex flex-col h-full">
                    <SheetHeader>
                        <SheetTitle>Chat [ ⌘b ]</SheetTitle>
                        <SheetDescription>
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-auto mb-auto">
                        <ScrollArea className="h-[400px] rounded-md border p-2">
                        Jokester began sneaking into the castle in the middle of the night and leaving
  jokes all over the place: under the king's pillow, in his soup, even in the
  royal toilet. The king was furious, but he couldn't seem to stop Jokester. And
  then, one day, the people of the kingdom discovered that the jokes left by
  Jokester were so funny that they couldn't help but laugh. And once they
  started laughing, they couldn't stop.Jokester began sneaking into the castle in the middle of the night and leaving
  jokes all over the place: under the king's pillow, in his soup, even in the
  royal toilet. The king was furious, but he couldn't seem to stop Jokester. And
  then, one day, the people of the kingdom discovered that the jokes left by
  Jokester were so funny that they couldn't help but laugh. And once they
  started laughing, they couldn't stop.
                        </ScrollArea>
                        <Card
                            className="border-[4px] border-gray-100 bg-lightGray my-2"
                        >
                            <Input
                                autoFocus
                                className="bg-lightGray border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                                // value={ search }
                                // onChange={ (event) => setSearch(event.target.value) }
                                // startIcon={ SearchIcon }
                                placeholder="Ask Proxima to make a change..."
                                // onKeyDown={(e) => {
                                //     if (e.key === 'Enter' && submitRef.current !== null) {
                                //         submitRef.current.click();
                                //     }
                                // }}
                            />
                            <div className="flex flex-row justify-between items-center">
                                <div className="flex flex-row items-center justify-center">
                                    <TooltipProvider delayDuration={ 0 }>
                                        <Tooltip>
                                            <TooltipTrigger className="">
                                                <div className="p-2" onClick={ toggleDropzone }>
                                                    { dropzoneOpen ? <XIcon size="16" /> : <PlusIcon size="16" /> }
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                                <p>Upload files</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div>
                                    <TooltipProvider delayDuration={ 0 }>
                                        <Tooltip>
                                            <TooltipTrigger className="">
                                                <div className="p-2">
                                                    <MicIcon size="16" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                                <p>Dictate</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider delayDuration={ 0 }>
                                        <Tooltip>
                                            <TooltipTrigger className="">
                                                <div className="p-2">
                                                    <ArrowUpIcon size="16" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                                <p>Enter</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                            { dropzoneOpen &&
                                <Dropzone {...props}>
                                    <DropzoneEmptyState />
                                    <DropzoneContent />
                                </Dropzone>
                            }
                        </Card>
                    </div>
                </SheetContent>
            </Sheet>
            <Link href={ `/program-builder` }>
                <div className="max-sm:hidden cursor-pointer text-sm flex flex-row justify-center items-center gap-2">
                    New
                    <SquarePenIcon size="16" />
                </div>
            </Link>
        </>
    );
};

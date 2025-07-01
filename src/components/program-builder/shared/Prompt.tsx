"use client";

import { ArrowUpIcon, MessageSquareWarningIcon, MicIcon, Paperclip, PlayIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserContext } from "@/contexts/UserContext";
import { User } from "@supabase/supabase-js";
import { PromptInput, PromptInputTextarea } from "@/components/ui/prompt-input";
import { PromptInputActions } from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { jack, people02, people03, people04, people05 } from "public";
import { AvatarStack } from "@/components/avatar-stack";
import {
    FileUpload,
    FileUploadContent,
    FileUploadTrigger,
  } from "@/components/ui/file-upload"
import { AiProgramGrid } from "./AiProgramGrid";
import { ConditionalHevyGrid } from "../hevy/ConditionalHevyGrid";
import { RecentProgramsGrid } from "./RecentProgramsGrid";
import { useRouter } from 'next/navigation'
import { suggestionGroups } from "@/assets/constants";

interface IProps {
    userData: User | null;
}

export const Prompt: React.FC<IProps> = ({ userData }) => {

    const { setUser } = useUserContext();
    const router = useRouter();

    const goToFilters = (search: string) => {
        router.push(`/program-builder/program-filters?search=${encodeURIComponent(search)}`);
    };

    useEffect(() => {
        if (userData) {
            setUser(userData);
        }
    }, [userData, setUser]);

    const [search, setSearch] = useState<string>("");

    const [activeCategory, setActiveCategory] = useState("")

    const [files, setFiles] = useState<File[]>([]);


    const handleFilesAdded = (newFiles: File[]) => {
      setFiles((prev) => [...prev, ...newFiles])
    }

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    };

    const handleSend = () => {
        if (search.trim()) {
            setActiveCategory("")
        }
        goToFilters(search)
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    };

    const handlePromptInputValueChange = (value: string) => {
      setSearch(value)
      // Clear active category when typing something different
      if (value.trim() === "") {
        setActiveCategory("")
      }
    };

    // Get suggestions based on active category
    const activeCategoryData = suggestionGroups.find(
      (group) => group.label === activeCategory
    );

    // Determine which suggestions to show
    const showCategorySuggestions = activeCategory !== "";

    return (
        <>
            <div className="sm:mt-[120px] sm:mb-[100px] max-sm:h-full max-sm:mt-[50px] max-sm:mb-[150px] flex flex-col max-sm:gap-0 items-center justify-center gap-6">
                <div className="text-center">
                    <div className="font-main text-4xl font-bold uppercase">What do you want to train?</div>
                    <div className="text-lg font-normal px-12">Create a workout program by chatting with AI</div>
                </div>
                <div className="flex flex-col max-sm:flex-col max-sm:pt-8 justify-center items-center w-full">
                    <div className="flex flex-col gap-2 w-full items-center">
                        <div className="w-full">
                            <span className="flex items-center justify-center">
                                <Button className="my-12 sm:hidden h-[60px] text-white rounded-xl w-[200px] bg-lightSecondary hover:bg-lightSecondary font-main uppercase flex items-center justify-center gap-4"><PlayIcon />Start</Button>
                            </span>
                            <div className="max-sm:hidden mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-3 pb-3 md:px-5 md:pb-5">
                            <FileUpload
                                onFilesAdded={ handleFilesAdded }
                                accept=".jpg,.jpeg,.png,.pdf,.docx"
                            >

                                <PromptInput
                                    className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
                                    value={search}
                                    onValueChange={handlePromptInputValueChange}
                                    onSubmit={handleSend}
                                >
                                    { files.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 pb-2 px-4">
                                            {files.map((file, index) => (
                                            <div
                                                key={index}
                                                className="bg-lightGray flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                <Paperclip className="size-4" />
                                                <span className="max-w-[80px] truncate text-sm">
                                                    {file.name}
                                                </span>
                                                </div>
                                                <button
                                                onClick={() => removeFile(index)}
                                                className="hover:bg-white rounded-full p-1"
                                                >
                                                <X className="size-4" />
                                                </button>
                                            </div>
                                            ))}
                                        </div>
                                    )}
                                    <PromptInputTextarea
                                        placeholder="Ask Proxima to build..."
                                        className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                                        onKeyDown={handleKeyDown}
                                    />
                                    <PromptInputActions className="mt-5 flex w-full items-end justify-between gap-2 px-3 pb-3">
                                    <FileUploadTrigger asChild>
                                        <div className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-start rounded-2xl">
                                            <Paperclip className="size-5" />
                                        </div>
                                    </FileUploadTrigger>
                                    <div className="flex flex-row gap-2">
                                        <TooltipProvider delayDuration={ 0 }>
                                            <Tooltip>
                                                <TooltipTrigger className="">
                                                    <div className="p-2">
                                                        <MicIcon className="size-5" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                                    <p>Dictate</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <Button
                                            size="sm"
                                            className="h-9 w-9 bg-lightSecondary text-white rounded-full"
                                            onClick={handleSend}
                                            disabled={!search.trim()}
                                        >
                                            <ArrowUpIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    </PromptInputActions>
                                </PromptInput>

                                <FileUploadContent>
                                    <div className="flex min-h-[200px] w-full items-center justify-center backdrop-blur-sm">
                                    <div className="bg-background/90 m-4 w-full max-w-md rounded-lg border p-8 shadow-lg">
                                        <div className="mb-4 flex justify-center">
                                        <svg
                                            className="text-muted size-8"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                                            />
                                        </svg>
                                        </div>
                                        <h3 className="mb-2 text-center text-base font-medium">
                                        Drop files to upload
                                        </h3>
                                        <p className="text-muted-foreground text-center text-sm">
                                        Release to add files to your message
                                        </p>
                                    </div>
                                    </div>
                                </FileUploadContent>
                            </FileUpload>
                                <div className="flex w-full flex-col items-center justify-center space-y-2">
                                    <div className="h-[70px] w-full">
                                    {showCategorySuggestions ? (
                                        <div className="flex w-full flex-col space-y-1">
                                            {activeCategoryData?.items.map((suggestion) => (
                                                <PromptSuggestion
                                                    key={suggestion}
                                                    highlight={activeCategoryData.highlight}
                                                    onClick={() => {
                                                        setSearch(suggestion)
                                                        // Optional: auto-send
                                                        // handleSend()
                                                    }}
                                                >
                                                {suggestion}
                                                </PromptSuggestion>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex w-full flex-wrap items-stretch justify-start gap-2">
                                        {suggestionGroups.map((suggestion) => {
                                            if (suggestion.label === "Empty Template") {
                                                return (
                                                    <Link
                                                        key={suggestion.label}
                                                        target="_self"
                                                        rel="noopener noreferrer"
                                                        href={ `/program-builder/build-program?empty=true&edit=true` }
                                                    >
                                                        <PromptSuggestion className="capitalize h-8 p-4 text-xs">
                                                            {suggestion.icon}
                                                            {suggestion.label}
                                                        </PromptSuggestion>
                                                    </Link>
                                                );
                                            }

                                            return (
                                                <PromptSuggestion
                                                    key={suggestion.label}
                                                    onClick={() => {
                                                        setActiveCategory(suggestion.label)
                                                        setSearch("") // Clear input when selecting a category
                                                    }}
                                                    className="capitalize h-8 p-4 text-xs"
                                                >
                                                    {suggestion.icon}
                                                    {suggestion.label}
                                                </PromptSuggestion>
                                            );
                                        })}
                                        </div>
                                    )}
                                    </div>
                                    </div>
                                </div>
                                <div className="pt-12 flex flex-col justify-center items-center">
                                    <AvatarStack
                                        avatars={[
                                            {name: "jack.hanlon", image:  jack.src},
                                            {name: "scottlhanlon", image: people03.src},
                                            {name: "jordan.vandesande", image: people04.src},
                                            {name: "marcola", image: people05.src},
                                            {name: "sina", image: people02.src},
                                            {name: "john.gardiner", image: people02.src},
                                            {name: "josh.rubis", image: people02.src},
                                            {name: "calvin.sytsma", image: people02.src},
                                            {name: "mark.shaio", image: people02.src},
                                            {name: "sigilai", image: people02.src},
                                            {name: "thomas.genet", image: people02.src},
                                            {name: "lukcamp", image: people02.src},
                                            {name: "alexabcj", image: people02.src},
                                            {name: "kalamataspartan", image: people02.src},
                                            {name: "alexalydiarose", image: people02.src},
                                        ] }
                                    />
                                    6,000+ lifters are building with Proxima
                                </div>
                        </div>

                    </div>
                </div>
            </div>
            <div className="bg-red-400 py-4 text-white hidden max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:items-center text-center">
                <MessageSquareWarningIcon />
                Please use on a desktop computer for best experience
            </div>
                <RecentProgramsGrid />
                <ConditionalHevyGrid />
                <AiProgramGrid />
            </>

    );
};

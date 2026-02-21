"use client"

import { FileUpload, FileUploadContent } from "@/components/ui/file-upload";
import {
  PromptInput,
  PromptInputProvider,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Paperclip, X, MicIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { suggestionGroups } from "@/assets/constants";
import { BUILD_PROGRAM_EMPTY_URL } from "@/components/program-builder/utils";
import { useTypewriterPlaceholder } from "@/hooks/useTypewriterPlaceholder";
import { useIsMobile } from "@/hooks/use-mobile";

function SyncSearchFromInput({
  setSearch,
  setActiveCategory,
}: {
  setSearch: (v: string) => void;
  setActiveCategory: (v: string) => void;
}) {
  const controller = usePromptInputController();
  useEffect(() => {
    const value = controller.textInput.value;
    setSearch(value);
    if (value.trim() === "") setActiveCategory("");
  }, [controller.textInput.value, setSearch, setActiveCategory]);
  return null;
}


export const PromptTemplate: React.FC = () => {

    const router = useRouter();

    // const goToFilters = (search: string) => {
    //     router.push(`/program-filters?search=${encodeURIComponent(search)}`);
    // };
    const goToProgramBuilder = (search: string) => {
        router.push(`/build-program?search=${encodeURIComponent(search)}&edit=true`);
    };

    const [search, setSearch] = useState<string>("");
    const [submitKey, setSubmitKey] = useState(0);
    const [initialInputKey, setInitialInputKey] = useState("");
    const [activeCategory, setActiveCategory] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const isMobile = useIsMobile();

    // Typewriter placeholder animation - only show when input is empty
    // Hide "Ask Andy to" prefix on mobile
    const animatedPlaceholder = useTypewriterPlaceholder({
        enabled: search.trim() === "",
        showPrefix: !isMobile,
    });

    const handleFilesAdded = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles])
    };


    const handleSend = (text?: string) => {
        const value = (text ?? search).trim();
        if (!value) return;
        setActiveCategory("");
        goToProgramBuilder(value);
        setSearch("");
        setSubmitKey((k) => k + 1);
        setInitialInputKey("");
        setIsLoading(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
    };

    // Get suggestions based on active category
    const activeCategoryData = suggestionGroups.find(
        (group) => group.label === activeCategory
      );

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    };

    // Determine which suggestions to show
    const showCategorySuggestions = activeCategory !== "";

    return (
        <div className="z-10 mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-3 pb-3 md:px-5 md:pb-5">
        <FileUpload
            onFilesAdded={ handleFilesAdded }
            accept=".jpg,.jpeg,.png,.pdf,.docx"
        >
            <PromptInputProvider key={`${submitKey}-${initialInputKey}`} initialInput={search}>
                <SyncSearchFromInput setSearch={setSearch} setActiveCategory={setActiveCategory} />
                <PromptInput
                    className="dark:bg-darkGray border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-2xs focus-within:border focus-within:border-gray-300 transition-all duration-200 max-sm:**:data-[slot=input-group]:flex-row! max-sm:**:data-[slot=input-group]:items-center max-sm:**:data-[slot=input-group-control]:min-w-0 max-sm:**:data-[slot=input-group-control]:flex-1"
                    onSubmit={({ text }) => handleSend(text)}
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
                        placeholder={animatedPlaceholder}
                        className="z-10 dark:text-white min-h-[44px] max-sm:min-h-24 pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                        onKeyDown={handleKeyDown}
                    />
                    <PromptInputFooter className="mt-5 flex w-full items-end justify-between gap-2 px-3 pb-3 max-sm:mt-0 max-sm:w-auto max-sm:shrink-0 max-sm:py-2 max-sm:px-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex h-8 w-8 cursor-not-allowed items-center justify-start rounded-2xl opacity-50">
                                    <Paperclip className="size-5" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-lightSecondary text-white">Coming soon</TooltipContent>
                        </Tooltip>
                        <div className="flex flex-row gap-2">
                            <TooltipProvider delayDuration={ 0 }>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="p-2 cursor-not-allowed opacity-50">
                                            <MicIcon className="size-5" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-lightSecondary text-white">Coming soon</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <PromptInputSubmit
                                status={isLoading ? "submitted" : "ready"}
                                disabled={!search.trim()}
                                className="h-9 w-9 bg-lightSecondary text-white rounded-full [&_svg]:text-white"
                            />
                        </div>
                    </PromptInputFooter>
                </PromptInput>
            </PromptInputProvider>

            <FileUploadContent>
                <div className="flex min-h-[200px] w-full items-center justify-center backdrop-blur-xs">
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
                <div className={`w-full ${showCategorySuggestions ? 'mb-6' : 'h-[70px]'}`}>
                {showCategorySuggestions ? (
                    <div className="flex w-full flex-col space-y-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveCategory("")}
                            className="mb-1 w-fit h-8 px-3 text-xs text-muted-foreground hover:text-foreground dark:text-gray-300 dark:hover:text-white self-end relative z-20"
                        >
                            <X className="size-4 mr-1" />
                            Cancel
                        </Button>
                        {activeCategoryData?.items.map((suggestion) => (
                            <PromptSuggestion
                                className="text-left bg-extraLightGray dark:bg-darkGray z-10"
                                key={suggestion}
                                highlight={activeCategoryData.highlight}
                                onClick={() => {
                                    setSearch(suggestion);
                                    setInitialInputKey(suggestion);
                                }}
                            >
                            {suggestion}
                            </PromptSuggestion>
                        ))}
                    </div>
                ) : (
                    <div className="flex w-full flex-wrap items-stretch justify-start max-sm:justify-center gap-2">
                    {suggestionGroups.map((suggestion) => {
                        if (suggestion.label === "Empty Template") {
                            return (
                                <Link
                                    key={suggestion.label}
                                    target="_self"
                                    className="z-10"
                                    rel="noopener noreferrer"
                                    href={BUILD_PROGRAM_EMPTY_URL}
                                >
                                    <PromptSuggestion className="capitalize h-8 p-4 text-xs dark:bg-darkGray">
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
                                    setActiveCategory(suggestion.label);
                                    setSearch("");
                                    setInitialInputKey("");
                                }}
                                className="capitalize h-8 p-4 text-xs dark:bg-darkGray z-10"
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
    )
}

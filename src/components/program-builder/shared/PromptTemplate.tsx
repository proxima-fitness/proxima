"use client"

import { FileUpload, FileUploadContent, FileUploadTrigger } from "@/components/ui/file-upload";
import { PromptInput, PromptInputActions, PromptInputTextarea } from "@/components/ui/prompt-input";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Paperclip, X, ArrowUpIcon, MicIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestionGroups } from "@/assets/constants";


export const PromptTemplate: React.FC = () => {

    const router = useRouter();

    const goToFilters = (search: string) => {
        router.push(`/program-filters?search=${encodeURIComponent(search)}`);
    };
    const [search, setSearch] = useState<string>("");
    const [activeCategory, setActiveCategory] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleFilesAdded = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles])
    };


    const handlePromptInputValueChange = (value: string) => {
        setSearch(value)
        // Clear active category when typing something different
        if (value.trim() === "") {
          setActiveCategory("")
        }
      };

      const handleSend = () => {
        if (search.trim()) {
            setActiveCategory("");
        }
        goToFilters(search);
        setIsLoading(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSend()
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

            <PromptInput
                className="dark:bg-darkGray border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs focus-within:border-1 focus-within:border-gray-300 transition-all duration-200"
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
                    placeholder="Ask Andy to build..."
                    className="z-10 dark:text-white min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
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
                        {!isLoading ? (
                    <ArrowUpIcon className="text-white h-4 w-4" />
                        ) : (
                            <span className="size-3 rounded-xs bg-white" />
                        )}
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
                                className="text-left bg-extraLightGray dark:bg-darkGray z-10"
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
                    <div className="flex w-full flex-wrap items-stretch justify-start max-sm:justify-center gap-2">
                    {suggestionGroups.map((suggestion) => {
                        if (suggestion.label === "Empty Template") {
                            return (
                                <Link
                                    key={suggestion.label}
                                    target="_self"
                                    className="z-10"
                                    rel="noopener noreferrer"
                                    href={ `/build-program?empty=true&edit=true` }
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
                                    setActiveCategory(suggestion.label)
                                    setSearch("") // Clear input when selecting a category
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

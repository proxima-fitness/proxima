/* eslint-disable @next/next/no-img-element */
"use client"

import {
  PromptInput,
  PromptInputProvider,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
  usePromptInputController,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Attachment,
  AttachmentHoverCard,
  AttachmentHoverCardContent,
  AttachmentHoverCardTrigger,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  getAttachmentLabel,
  getMediaCategory,
} from "@/components/ai-elements/attachments";
import type { AttachmentData } from "@/components/ai-elements/attachments";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Paperclip, X, MicIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { memo, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { suggestionGroups, quickTriggerSuggestionChips } from "@/assets/constants";
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

interface IAttachmentItemProps {
  attachment: AttachmentData;
  onRemove: (id: string) => void;
}

const AttachmentItem = memo(({ attachment, onRemove }: IAttachmentItemProps) => {
  const handleRemove = useCallback(
    () => onRemove(attachment.id),
    [onRemove, attachment.id]
  );
  const mediaCategory = getMediaCategory(attachment);
  const label = getAttachmentLabel(attachment);

  return (
    <AttachmentHoverCard>
      <AttachmentHoverCardTrigger asChild>
        <Attachment data={attachment} onRemove={handleRemove}>
          <div className="relative size-5 shrink-0">
            <div className="absolute inset-0 transition-opacity group-hover:opacity-0">
              <AttachmentPreview />
            </div>
            <AttachmentRemove className="absolute inset-0" />
          </div>
          <AttachmentInfo />
        </Attachment>
      </AttachmentHoverCardTrigger>
      <AttachmentHoverCardContent>
        <div className="space-y-3">
          {mediaCategory === "image" &&
            attachment.type === "file" &&
            attachment.url && (
              <div className="flex max-h-96 w-80 items-center justify-center overflow-hidden rounded-md border">
                <img
                  alt={label}
                  className="max-h-full max-w-full object-contain"
                  height={384}
                  src={attachment.url}
                  width={320}
                />
              </div>
            )}
          <div className="space-y-1 px-0.5">
            <h4 className="font-semibold text-sm leading-none">{label}</h4>
            {attachment.mediaType && (
              <p className="font-mono text-muted-foreground text-xs">
                {attachment.mediaType}
              </p>
            )}
          </div>
        </div>
      </AttachmentHoverCardContent>
    </AttachmentHoverCard>
  );
});

AttachmentItem.displayName = "AttachmentItem";

interface IPromptTemplateInputProps {
  animatedPlaceholder: string;
  isLoading: boolean;
  canSubmit: boolean;
  onSend: (text?: string) => void;
}

const PromptTemplateInput: React.FC<IPromptTemplateInputProps> = ({
  animatedPlaceholder,
  isLoading,
  canSubmit,
  onSend,
}) => {
  const attachments = usePromptInputAttachments();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handlePaperclipClick = () => {
    attachments.openFileDialog();
  };

  const handleRemoveAttachment = useCallback(
    (id: string) => attachments.remove(id),
    [attachments]
  );

  return (
    <PromptInput
      className="dark:bg-darkGray border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-2xs focus-within:border focus-within:border-gray-300 transition-all duration-200"
      accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      multiple
      onSubmit={({ text }) => onSend(text)}
    >
      {attachments.files.length > 0 && (
        <div className="flex w-full shrink-0 justify-start overflow-x-auto overflow-y-hidden pl-4 pt-1 pr-3 pb-2">
          <Attachments variant="inline" className="flex flex-nowrap gap-2 justify-start">
            {attachments.files.map((attachment) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                onRemove={handleRemoveAttachment}
              />
            ))}
          </Attachments>
        </div>
      )}
      <PromptInputTextarea
        placeholder={animatedPlaceholder}
        className="z-10 dark:text-white min-h-[44px] max-sm:min-h-10 pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
        onKeyDown={handleKeyDown}
      />
      <PromptInputFooter className="mt-5 flex w-full shrink-0 items-end justify-between gap-2 px-3 pb-3 max-sm:mt-0 max-sm:py-2 max-sm:px-2 max-sm:items-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handlePaperclipClick}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl hover:bg-extraLightGray dark:hover:bg-darkGray/80"
            >
              <Paperclip className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-lightSecondary text-white">
            Attach files
          </TooltipContent>
        </Tooltip>
        <div className="flex shrink-0 flex-row items-end gap-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 cursor-not-allowed opacity-50">
                  <MicIcon className="size-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-lightSecondary text-white">
                Coming soon
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PromptInputSubmit
            status={isLoading ? "submitted" : "ready"}
            disabled={!canSubmit}
            className="h-9 w-9 bg-lightSecondary text-white rounded-full [&_svg]:text-white"
          />
        </div>
      </PromptInputFooter>
    </PromptInput>
  );
};

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
    const [isLoading, setIsLoading] = useState(false);
    const isMobile = useIsMobile();

    // Typewriter placeholder animation - only show when input is empty
    // Hide "Ask Andy to" prefix on mobile
    const animatedPlaceholder = useTypewriterPlaceholder({
        enabled: search.trim() === "",
        showPrefix: !isMobile,
    });

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

    // Get suggestions based on active category
    const activeCategoryData = suggestionGroups.find(
        (group) => group.label === activeCategory
      );

    // Determine which suggestions to show
    const showCategorySuggestions = activeCategory !== "";

    return (
        <div className="z-10 mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-3 pb-3 md:px-5 md:pb-5">
            <div className="relative z-[100] w-full">
                <PromptInputProvider key={`${submitKey}-${initialInputKey}`} initialInput={search}>
                    <SyncSearchFromInput setSearch={setSearch} setActiveCategory={setActiveCategory} />
                    <PromptTemplateInput
                        animatedPlaceholder={animatedPlaceholder}
                        isLoading={isLoading}
                        canSubmit={!!search.trim()}
                        onSend={handleSend}
                    />
                </PromptInputProvider>
            </div>
            <div className="flex w-full flex-col items-center justify-center space-y-2">
                <div className="mb-3 w-full flex flex-wrap justify-center gap-3 block md:hidden">
                  {quickTriggerSuggestionChips.map((label) => (
                    <Suggestion
                      key={label}
                      suggestion={label}
                      onClick={goToProgramBuilder}
                      className="dark:border-none"
                    />
                  ))}
                </div>
                <div className={`w-full hidden md:block ${showCategorySuggestions ? 'mb-6' : 'h-[70px]'}`}>
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
                            <Suggestion
                                key={suggestion}
                                suggestion={suggestion}
                                onClick={() => {
                                    setSearch(suggestion);
                                    setInitialInputKey(suggestion);
                                }}
                                className="text-left bg-extraLightGray dark:bg-darkGray dark:border-none z-10"
                            />
                        ))}
                    </div>
                ) : (
                    <Suggestions className="w-full">
                    {suggestionGroups.map((suggestion) => {
                        if (suggestion.label === "Start from scratch") {
                            return (
                                <Suggestion
                                    key={suggestion.label}
                                    suggestion={suggestion.label}
                                    onClick={() => router.push(BUILD_PROGRAM_EMPTY_URL)}
                                    className="capitalize h-8 p-4 text-xs dark:bg-darkGray dark:border-none z-10"
                                >
                                    {suggestion.icon}
                                    {suggestion.label}
                                </Suggestion>
                            );
                        }

                        return (
                            <Suggestion
                                key={suggestion.label}
                                suggestion={suggestion.label}
                                onClick={() => {
                                    setActiveCategory(suggestion.label);
                                    setSearch("");
                                    setInitialInputKey("");
                                }}
                                className="capitalize h-8 p-4 text-xs dark:bg-darkGray dark:border-none z-10"
                            >
                                {suggestion.icon}
                                {suggestion.label}
                            </Suggestion>
                        );
                    })}
                    </Suggestions>
                )}
                </div>
                </div>
        </div>
    )
}

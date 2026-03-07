/**
 * @module Chat
 * Chat input for program builder: suggestions, upgrade banner, PromptInput with attachments and submit/stop. Used inside Agent.
 * Depends on: prompt-input, attachments, suggestion, UpgradeBanner, useMyFeatureLimits. Used by: Agent.
 */
/* eslint-disable @next/next/no-img-element */
import {
  PromptInput,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputSubmit,
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
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Mic, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { useMyFeatureLimits } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { quickTriggerSuggestionChips } from "@/assets/constants";
import type { FileUIPart } from "ai";
import { memo, useCallback, useState } from "react";
import { Questions } from "@/components/ui/questions";
import type { IQuestion } from "@/components/ui/questions";

/** Payload when questions are shown in place of the prompt input (e.g. after getMoreInfoQuestions tool). */
export interface IQuestionsPayload {
  questions: IQuestion[];
  userRequest?: string;
  initialAnswers?: Record<string, string | string[]>;
}

/** Props for the chat input container. */
interface IProps {
  isLoading: boolean;
  handleSubmit: (text: string, files?: FileUIPart[]) => void;
  handleStop: () => void;
  /** Whether to show quick-trigger suggestion chips (e.g. when no messages). */
  showSuggestions?: boolean;
  /** When set, show Questions in place of PromptInput until user completes or skips. */
  questionsPayload?: IQuestionsPayload | null;
  onQuestionsComplete?: (answers: Record<string, string | string[]>) => void;
  onQuestionsSkip?: () => void;
  /** Called when user dismisses the questions without building (e.g. close button). */
  onQuestionsDismiss?: () => void;
  isBuilding?: boolean;
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

interface IChatInputBodyProps {
  isLoading: boolean;
  outOfCredits: boolean;
  handleStop: () => void;
}

/** Inner input + attachments + submit/stop; desktop stacked, mobile inline row. */
const ChatInputBody = ({
  isLoading,
  outOfCredits,
  handleStop,
}: IChatInputBodyProps) => {
  const attachments = usePromptInputAttachments();
  const [isMultiline, setIsMultiline] = useState(false);

  const handleRemoveAttachment = useCallback(
    (id: string) => attachments.remove(id),
    [attachments]
  );

  const handlePaperclipClick = () => {
    attachments.openFileDialog();
  };

  const checkMultiline = useCallback((ta: HTMLTextAreaElement) => {
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    const paddingY = parseFloat(getComputedStyle(ta).paddingTop) + parseFloat(getComputedStyle(ta).paddingBottom) || 24;
    const singleLineHeight = lineHeight + paddingY;
    setIsMultiline(ta.scrollHeight > singleLineHeight);
  }, []);

  const setRowRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        queueMicrotask(() => {
          const ta = el.querySelector("textarea");
          if (ta) checkMultiline(ta);
        });
      }
    },
    [checkMultiline]
  );

  const alignClass = isMultiline ? "items-end" : "items-center";

  return (
    <>
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
      {/* Desktop: original stacked layout (textarea above footer) */}
      <div data-align="block-end" className="hidden md:block w-full">
        <PromptInputTextarea
          placeholder="Ask anything…"
          className="dark:text-white pl-4 text-base leading-[1.3] sm:text-base md:text-base"
        />
        <PromptInputFooter className="mt-5 flex w-full shrink-0 items-end justify-between gap-2 px-3 pb-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handlePaperclipClick}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black dark:bg-black dark:text-white hover:bg-white/90"
                aria-label="Attach files"
              >
                <Paperclip className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-lightSecondary text-white">
              Attach files
            </TooltipContent>
          </Tooltip>
          <div className="flex shrink-0 flex-row items-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full bg-white text-black dark:bg-black dark:text-white hover:bg-white/90 hover:text-white [&_svg]:text-black dark:[&_svg]:text-white disabled:opacity-60"
                    disabled
                    aria-label="Voice input (coming soon)"
                  >
                    <Mic size={18} />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-lightSecondary text-white">
                Coming soon
              </TooltipContent>
            </Tooltip>
            <PromptInputSubmit
              status={isLoading ? "streaming" : "ready"}
              onStop={handleStop}
              disabled={outOfCredits}
              className="size-9 rounded-full bg-lightSecondary [&_svg]:text-white"
            />
          </div>
        </PromptInputFooter>
      </div>
      {/* Mobile: inline row (paperclip | textarea | mic+submit) */}
      <div
        ref={setRowRef}
        data-align="block-end"
        className={cn(
          "flex w-full shrink-0 gap-2 px-3 py-2 max-sm:px-2 order-last md:hidden",
          alignClass
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handlePaperclipClick}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-black text-black dark:text-white hover:bg-lightSecondary/90"
              aria-label="Attach files"
            >
              <Paperclip className="size-4 text-black dark:text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-lightSecondary text-white">
            Attach files
          </TooltipContent>
        </Tooltip>
        <PromptInputTextarea
          placeholder="Ask anything…"
          className="dark:text-white min-h-9 flex-1 min-w-0 py-2 text-base leading-[1.3] max-sm:min-h-8 max-sm:h-auto max-sm:py-1.5 [&::placeholder]:text-sm"
          onChange={(e) => checkMultiline(e.currentTarget)}
        />
        <div className={cn("flex shrink-0 flex-row gap-2", alignClass)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full bg-white text-black dark:bg-black dark:text-white hover:bg-white/90 hover:text-white [&_svg]:text-black dark:[&_svg]:text-white disabled:opacity-50"
                  disabled
                  aria-label="Voice input (coming soon)"
                >
                  <Mic size={18} />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-lightSecondary text-white">
              Coming soon
            </TooltipContent>
          </Tooltip>
          <PromptInputSubmit
            status={isLoading ? "streaming" : "ready"}
            onStop={handleStop}
            disabled={outOfCredits}
            className="size-9 rounded-full bg-lightSecondary [&_svg]:text-white"
          />
        </div>
      </div>
    </>
  );
};

/** Chat footer: suggestions, upgrade banner when not pro, and PromptInput or Questions. */
export const Chat: React.FC<IProps> = (props) => {
  const {
    isLoading,
    handleSubmit,
    handleStop,
    showSuggestions = true,
    questionsPayload,
    onQuestionsComplete,
    onQuestionsSkip,
    onQuestionsDismiss,
    isBuilding = false,
  } = props;
  const { user } = useUserContext();
  const { data: featureLimits } = useMyFeatureLimits(user);
  const outOfCredits = featureLimits != null && featureLimits.remaining_llm_requests === 0;
  const isPro = featureLimits?.has_active_subscription === true;
  const showQuestions = questionsPayload != null && questionsPayload.questions?.length > 0;

  return (
    <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5 max-sm:fixed max-sm:bottom-[70px] max-sm:left-0 max-sm:right-0 max-sm:px-4 max-sm:bg-background max-sm:dark:bg-extraDarkGray pt-4 max-sm:pt-2">
      {showSuggestions && !showQuestions && (
        <Suggestions className="mb-3">
          {quickTriggerSuggestionChips.map((label) => (
            <Suggestion
              key={label}
              suggestion={label}
              onClick={handleSubmit}
              className="dark:border-none"
            />
          ))}
        </Suggestions>
      )}
      {featureLimits && !isPro && (
        <UpgradeBanner remainingRequests={featureLimits.remaining_llm_requests} totalRequests={featureLimits.max_monthly_llm_requests} user={user} />
      )}
      <div className="flex w-full">
        {showQuestions ? (
          <div className="min-w-0 flex-1 sm:bg-white bg-extraLightGray dark:bg-darkGray relative z-10 p-0 rounded-md max-sm:pt-0 shadow-2xs overflow-hidden">
            <Questions
              className="w-full min-w-full"
              questions={questionsPayload.questions}
              initialAnswers={questionsPayload.initialAnswers}
              onComplete={onQuestionsComplete}
              onSkip={onQuestionsSkip}
              onDismiss={onQuestionsDismiss}
              isBuilding={isBuilding}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <PromptInputProvider>
            <PromptInput
              onSubmit={({ text, files }) => handleSubmit(text, files)}
              className="min-w-0 flex-1 sm:bg-white bg-extraLightGray dark:bg-darkGray relative z-10 rounded-3xl p-0 pt-1 max-sm:pt-0 shadow-2xs"
            >
              <ChatInputBody
                isLoading={isLoading}
                outOfCredits={outOfCredits}
                handleStop={handleStop}
              />
            </PromptInput>
          </PromptInputProvider>
        )}
      </div>
    </div>
  );
};

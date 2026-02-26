import {
  PromptInput,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import {
  Mic,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { useMyFeatureLimits } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { quickTriggerSuggestionChips } from "@/assets/constants";

interface IProps {
  isLoading: boolean;
  handleSubmit: (text: string) => void;
  handleStop: () => void;
  showSuggestions?: boolean;
}

export const Chat: React.FC<IProps> = (props) => {
  const { isLoading, handleSubmit, handleStop, showSuggestions = true } = props;
  const { user } = useUserContext();
  const { data: featureLimits } = useMyFeatureLimits(user);
  const outOfCredits = featureLimits != null && featureLimits.remaining_llm_requests === 0;
  const isPro = featureLimits?.has_active_subscription === true;

  return (
    <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 md:px-5 md:pb-5 max-sm:fixed max-sm:bottom-[70px] max-sm:left-0 max-sm:right-0 max-sm:px-4 max-sm:bg-background max-sm:dark:bg-extraDarkGray pt-4 max-sm:pt-2">
      {showSuggestions && (
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
      <div className="flex w-full items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0 max-sm:inline-flex sm:hidden">
              <Button
                variant="outline"
                size="icon"
                className="size-11 rounded-full dark:bg-darkGray bg-extraLightGray border-none"
                disabled
              >
                <PlusIcon size={18} />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="bg-lightSecondary text-white">Coming soon</TooltipContent>
        </Tooltip>
        <PromptInput
          onSubmit={({ text }) => handleSubmit(text)}
          className="min-w-0 flex-1 sm:bg-white bg-extraLightGray dark:bg-darkGray relative z-10 rounded-3xl p-0 pt-1 max-sm:pt-0 shadow-2xs max-sm:**:data-[slot=input-group]:flex-row! max-sm:**:data-[slot=input-group]:items-center max-sm:**:data-[slot=input-group-control]:min-w-0 max-sm:**:data-[slot=input-group-control]:flex-1"
        >
          <PromptInputTextarea
            placeholder="Ask anything..."
            className="dark:text-white pl-4 text-base leading-[1.3] sm:text-base md:text-base max-sm:min-h-10 max-sm:py-2"
          />
          <PromptInputFooter className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3 max-sm:mt-0 max-sm:w-auto max-sm:shrink-0 max-sm:px-2 max-sm:pb-1.5 max-sm:pt-1 max-sm:justify-end">
            <div className="hidden sm:flex shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                    disabled
                  >
                    <PlusIcon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-lightSecondary text-white">Coming soon</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full"
                      disabled
                    >
                      <Mic size={18} />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-lightSecondary text-white">Coming soon</TooltipContent>
              </Tooltip>
              <PromptInputSubmit
                status={isLoading ? "streaming" : "ready"}
                onStop={handleStop}
                disabled={outOfCredits}
                className="size-9 rounded-full bg-lightSecondary [&_svg]:text-white"
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

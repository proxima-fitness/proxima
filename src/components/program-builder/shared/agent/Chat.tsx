import {
    PromptInput,
    PromptInputAction,
    PromptInputActions,
    PromptInputTextarea,
  } from "@/components/ui/prompt-input"
  import {
    ArrowUp,
    Mic,
    MoreHorizontal,
    Square,
  } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { useMyFeatureLimits } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";

interface IProps {
    isLoading: boolean;
    input: string;
    setInput: (value: string) => void;
    handleSubmit: () => void;
    handleStop: () => void;
}

export const Chat: React.FC<IProps> = (props) => {

    const { isLoading, input, setInput, handleSubmit, handleStop } = props;
    const { user } = useUserContext();
    const { data: featureLimits } = useMyFeatureLimits(user);
    const outOfCredits = featureLimits != null && featureLimits.remaining_llm_requests === 0;
    return (
        <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl flex-shrink-0 px-3 pb-3 md:px-5 md:pb-5 max-sm:fixed max-sm:bottom-[70px] max-sm:left-0 max-sm:right-0 max-sm:px-4 max-sm:bg-background border-t pt-4">
            {featureLimits && (
                <UpgradeBanner remainingRequests={featureLimits.remaining_llm_requests} totalRequests={featureLimits.max_monthly_llm_requests} user={user} />
            )}
            <PromptInput
                isLoading={isLoading}
                value={input}
                onValueChange={value => setInput(value)}
                onSubmit={handleSubmit}
                disabled={outOfCredits}
                className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
            >
            <div className="flex flex-col">
                <PromptInputTextarea
                    placeholder="Ask Andy anything..."
                    className="dark:text-white min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                    />

                <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="More actions">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                    >
                        <MoreHorizontal size={18} />
                    </Button>
                    </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="Voice input">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                    >
                        <Mic size={18} />
                    </Button>
                    </PromptInputAction>

                    {!isLoading ? (
                        <Button
                        size="icon"
                        disabled={outOfCredits || !input.trim()}
                        onClick={handleSubmit}
                        className="size-9 rounded-full bg-lightSecondary"
                        >
                            <ArrowUp className="text-white" size={18} />
                        </Button>
                    ) : (
                        <Button
                        size="icon"
                        onClick={handleStop}
                        className="size-9 rounded-full bg-lightSecondary"
                        >
                            <Square className="text-white" size={18} />
                        </Button>
                    )}
                </div>
                </PromptInputActions>
            </div>
            </PromptInput>
        </div>
    )
}

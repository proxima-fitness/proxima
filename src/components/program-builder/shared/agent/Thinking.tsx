import { Message, MessageContent } from "@/components/ai-elements/message"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export const Thinking: React.FC = () => {
    return (
        <Message
            from="assistant"
            className={cn(
                "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2",
                "items-start"
            )}
        >
            <div className="group flex w-full flex-col gap-0">
                <MessageContent className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                    </div>
                </MessageContent>
            </div>
        </Message>
    )
}

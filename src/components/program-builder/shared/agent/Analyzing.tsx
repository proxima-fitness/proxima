
import {
    Message,
} from "@/components/ui/message"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"


export const Analyzing: React.FC = () => {
    return (
        <Message
            className={cn(
                "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2",
                "items-start"
            )}
        >
            <div className="group flex w-full flex-col gap-0">
                <div className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Analyzing...</span>
                    </div>
                </div>
            </div>
        </Message>
    )
}

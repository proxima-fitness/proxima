/** Error banner with retry and "Explore Programs" link when build fails. */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button"
import Link from "next/link";

interface IProps {
    error: Error | null;
    onRetry: () => void;
    retryCount: number;
    maxRetries: number;
    completedDays: number;
    totalDays: number;
}

export const AgentGenerationError: React.FC<IProps> = (props) => {

    const { error, onRetry, retryCount, maxRetries, completedDays, totalDays } = props;

    if (!error) return null;

    const canRetry = retryCount < maxRetries;
    const hasPartialProgress = completedDays > 0;


    return (
        <div className="mx-auto w-full max-w-3xl px-2 sm:px-4 md:px-6 pt-2">
        <div className="flex flex-col gap-3 p-3 sm:p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-red-200/80 dark:border-red-800/80">
            <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 min-w-0">
                    <p className="font-medium text-base text-red-700 dark:text-red-300">
                        Workout generation failed
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {hasPartialProgress
                            ? `Generated ${completedDays} of ${totalDays} days before encountering an error.`
                            : "Something went wrong while building your program."
                        }
                    </p>
                    {retryCount > 0 && (
                        <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                            Retry attempt {retryCount} of {maxRetries} failed
                        </p>
                    )}
                </div>
            </div>
            <div className="flex flex-col flex-wrap items-center justify-center sm:flex-row gap-2 mt-2 sm:mt-1">
                {canRetry && (
                    <Button
                        size="sm"
                        onClick={onRetry}
                        className="w-full sm:w-auto rounded-full border-0 bg-red-600 px-4 text-white hover:bg-red-700"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                )}
                <Link href="/programs">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto rounded-full border-border/80 text-muted-foreground hover:bg-muted/50"
                    >
                        Explore Programs
                    </Button>
                </Link>
            </div>
        </div>
    </div>
    );
};

import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { linkProgramToChat } from "@/api/chat-history";

export type TLinkSavedProgramToChatResult =
    | { linked: true }
    | { linked: false; skipped: true }
    | { linked: false; skipped: false; error: string };

function linkProgramToChatFailureMessage(
    result: TChatHistoryWriteResult | { error: string },
): string {
    if ("success" in result) {
        return result.success === false ? result.error : "Unknown error";
    }
    return result.error;
}

/**
 * After implicit save (e.g. Hevy export), associate the program with the active chat row.
 * Skips when there is no persist chat id (program-only path).
 */
export async function linkSavedProgramToChat({
    user,
    persistChatId,
    programId,
    queryClient,
}: {
    user: User | null | undefined;
    persistChatId: string;
    programId: number | string;
    queryClient?: QueryClient;
}): Promise<TLinkSavedProgramToChatResult> {
    if (!user || !persistChatId.trim()) {
        return { linked: false, skipped: true };
    }

    const result = await linkProgramToChat(user, persistChatId, String(programId));

    if ("success" in result && result.success) {
        if (queryClient) {
            void queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
        }
        return { linked: true };
    }

    return {
        linked: false,
        skipped: false,
        error: linkProgramToChatFailureMessage(result),
    };
}

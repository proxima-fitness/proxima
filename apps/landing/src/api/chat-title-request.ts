/**
 * @module api/chat-title-request
 *
 * Browser fire-and-forget for **Chat title** generation after a new chat row
 * is inserted. Invalidates recents only when the generated title is applied.
 *
 * Depends on: @tanstack/react-query
 * Used by: use-build-program-chat
 */

import type { QueryClient } from "@tanstack/react-query";

export interface IRequestGeneratedChatTitleInput {
    chatId: string;
    userId: string;
    queryClient: Pick<QueryClient, "invalidateQueries">;
}

/**
 * Starts Chat title generation. Does not throw. Does not block send.
 *
 * @param input - New chat id, user id, and query client for recents refresh
 */
export function requestGeneratedChatTitle({
    chatId,
    userId,
    queryClient,
}: IRequestGeneratedChatTitleInput): void {
    if (!chatId || !userId) {
        return;
    }

    void fetch("/api/chat/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
    })
        .then(async (response) => {
            if (!response.ok) {
                return;
            }
            const body: unknown = await response.json();
            const applied =
                body != null &&
                typeof body === "object" &&
                "applied" in body &&
                body.applied === true;
            if (applied) {
                void queryClient.invalidateQueries({ queryKey: ["chat-ids", userId] });
            }
        })
        .catch(() => {
            // Placeholder title stays. No retry.
        });
}

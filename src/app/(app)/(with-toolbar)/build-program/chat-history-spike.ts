/** Sub-plan 0 spike — remove in Sub-plan 4 when production onFinish ships (see 04-chat-history-persistence-onfinish-upsert.md). */
export function logChatHistoryOnFinishSpike({
    messages,
    isAbort,
    isError,
    isDisconnect,
    finishReason,
}: {
    message: TChatMessage;
    messages: TChatMessage[];
    isAbort: boolean;
    isError: boolean;
    isDisconnect: boolean;
    finishReason?: string;
}) {
    if (process.env.NODE_ENV !== "development") return;

    console.info("[chat-history-spike] onFinish", {
        messageCount: messages.length,
        roles: messages.map((m) => m.role),
        messageIds: messages.map((m) => m.id),
        isAbort,
        isError,
        isDisconnect,
        finishReason,
    });
}

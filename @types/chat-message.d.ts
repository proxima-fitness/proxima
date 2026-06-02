import type { UIDataTypes, UIMessage, UITools } from "ai";

declare global {
    /** UIMessage alias for chat history persistence. */
    type TChatMessage = UIMessage<unknown, UIDataTypes, UITools>;

    type TChatHistory = {
        id: string;
        conversation?: TChatMessage[];
        created_at: string;
        title: string;
        user_id?: string;
        program_id: string | null;
        pinned?: boolean;
    };

    type TChatListItem = Pick<
        TChatHistory,
        "id" | "created_at" | "title" | "program_id" | "pinned"
    >;

    /** Minimal router surface for chat URL updates (`useRouter()` satisfies this). */
    interface IChatHistoryRouter {
        replace: (href: string) => void;
    }

    type TChatHistoryWriteResult =
        | { success: true; id?: string | null }
        | { success: false; error: string };

    interface IUpsertChatHistoryTurnInput {
        user: import("@supabase/supabase-js").User | null | undefined;
        chatId: string;
        messages: TChatMessage[];
        title?: string;
    }

    interface IEnsureChatSessionOnSendInput {
        user: import("@supabase/supabase-js").User | null | undefined;
        chatId: string;
        firstUserText: string;
    }

    interface IEnsureChatSessionOnSendResult {
        chatId: string;
        confirmed: boolean;
    }

    interface IMigrateAnonymousThreadToChatInput {
        user: import("@supabase/supabase-js").User | null | undefined;
        messages: TChatMessage[];
        router: IChatHistoryRouter;
        pathname: string;
        searchParams: import("next/navigation").ReadonlyURLSearchParams;
    }

    interface IMigrateAnonymousThreadToChatResult {
        chatId: string;
        confirmed: boolean;
        messages: TChatMessage[];
    }
}

export {};

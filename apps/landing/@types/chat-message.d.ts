import type {
    UIDataTypes,
    UIMessage,
    UITools,
    ChatRequestOptions,
    CreateUIMessage,
    FileUIPart,
} from "ai";

declare global {
    /** UIMessage alias for chat history persistence. */
    type TChatMessage = UIMessage<unknown, UIDataTypes, UITools>;

    type TChatSendMessageParam =
        | (CreateUIMessage<TChatMessage> & {
              text?: never;
              files?: never;
              messageId?: string;
          })
        | {
              text: string;
              files?: FileList | FileUIPart[];
              metadata?: unknown;
              parts?: never;
              messageId?: string;
          }
        | {
              files: FileList | FileUIPart[];
              metadata?: unknown;
              parts?: never;
              messageId?: string;
          };

    type TSendMessageWithContext = (
        message?: TChatSendMessageParam,
        options?: ChatRequestOptions,
    ) => Promise<void>;

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
        /** True only on a successful insert this call (not an existing row). */
        inserted: boolean;
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

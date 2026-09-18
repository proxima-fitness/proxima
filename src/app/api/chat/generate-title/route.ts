/**
 * @module chat/generate-title
 *
 * Company-borne **Chat title** generation from the first user prompt.
 * Unmetered. Replaces the derived insert placeholder once; skips when the
 * user already renamed or there is no user text.
 *
 * Depends on: @/utils/supabase/server, @/api/chat-title, @/api/chat-title-write, ./generate
 * Used by: use-build-program-chat (insert-on-send, Sign-in migration)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
    deriveChatTitleFromMessages,
    firstUserMessageText,
} from "@/api/chat-title";
import {
    applyGeneratedChatTitleIfPlaceholder,
    getChatTitleSource,
} from "@/api/chat-title-write";
import { generateChatTitle } from "./generate";

export const maxDuration = 30;

function readChatId(value: unknown): string {
    if (value == null || typeof value !== "object") {
        return "";
    }
    if (!("chatId" in value) || typeof value.chatId !== "string") {
        return "";
    }
    return value.chatId.trim();
}

function skipped(reason: string) {
    return NextResponse.json({ applied: false, skipped: true, reason });
}

export async function POST(req: Request) {
    const supabasePromise = createClient();
    const bodyPromise = req.json().then(readChatId).catch(() => "");

    try {
        const supabase = await supabasePromise;
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const chatId = await bodyPromise;
        if (!chatId) {
            return NextResponse.json({ error: "chatId required" }, { status: 400 });
        }

        const source = await getChatTitleSource(supabase, user.id, chatId);
        if (!source) {
            return skipped("not-found");
        }

        const firstUserText = firstUserMessageText(source.conversation);
        if (!firstUserText) {
            return skipped("no-text");
        }

        const placeholder = deriveChatTitleFromMessages(source.conversation);
        if (source.title !== placeholder) {
            return skipped("title-changed");
        }

        const generated = await generateChatTitle(firstUserText);
        if (!generated) {
            return skipped("empty-model-output");
        }

        const result = await applyGeneratedChatTitleIfPlaceholder(
            supabase,
            user.id,
            chatId,
            placeholder,
            generated,
        );

        if (result !== "applied") {
            return skipped("cas-skipped");
        }

        return NextResponse.json({ applied: true, title: generated });
    } catch (error) {
        console.error("[generate-title] failed:", error);
        return skipped("error");
    }
}

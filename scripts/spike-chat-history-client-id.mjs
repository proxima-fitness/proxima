/**
 * Sub-plan 0 spike — live Supabase insert with client-assigned UUID.
 * Run: node scripts/spike-chat-history-client-id.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_REACT_APP_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const clientChatId = randomUUID();

const { data: sampleRow, error: sampleError } = await supabase
    .from("chat_history")
    .select("user_id")
    .limit(1)
    .maybeSingle();

let userId = sampleRow?.user_id;

if (!userId) {
    const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id")
        .limit(1)
        .maybeSingle();

    if (userError || !userRow?.id) {
        console.error(
            "Could not resolve a user_id for spike insert:",
            sampleError?.message ?? userError?.message ?? "no chat_history or users rows",
        );
        process.exit(1);
    }

    userId = userRow.id;
}

const conversation = [
    {
        id: "spike-user",
        role: "user",
        parts: [{ type: "text", text: "sub-plan 0 spike" }],
    },
];

const { data: inserted, error: insertError } = await supabase
    .from("chat_history")
    .insert({
        id: clientChatId,
        user_id: userId,
        conversation,
        title: "spike test (delete me)",
        program_id: null,
    })
    .select("id")
    .single();

if (insertError) {
    console.error("Insert failed:", insertError.message);
    process.exit(1);
}

if (inserted.id !== clientChatId) {
    console.error(`ID mismatch: expected ${clientChatId}, got ${inserted.id}`);
    process.exit(1);
}

const { error: deleteError } = await supabase.from("chat_history").delete().eq("id", clientChatId);

if (deleteError) {
    console.warn("Spike row inserted but cleanup failed — delete manually:", clientChatId, deleteError.message);
    process.exit(1);
}

console.log("OK — client-assigned UUID accepted as chat_history.id:", clientChatId);

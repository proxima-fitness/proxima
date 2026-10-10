/**
 * @module auth/delete-account
 *
 * Server-side delete-account API route. Verifies the current session, then
 * deletes the user via Supabase Auth Admin API (service role). Caller must be
 * authenticated.
 *
 * Depends on: @/utils/supabase/server (session), @supabase/supabase-js (admin client).
 * Used by: DeleteAccountDialog.
 */

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();

        if (sessionError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL;

        if (!serviceRoleKey || !supabaseUrl) {
            console.error("Missing SUPABASE_SECRET_KEY or NEXT_PUBLIC_REACT_APP_SUPABASE_URL");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error("Error deleting user:", deleteError);
            return NextResponse.json(
                { error: "Failed to delete account" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete account error:", error);
        return NextResponse.json(
            { error: "Failed to delete account" },
            { status: 500 }
        );
    }
}

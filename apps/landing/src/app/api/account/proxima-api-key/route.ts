// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module account/proxima-api-key
 *
 * Cookie-session mint / presence / revoke for the athlete's **Proxima API key**.
 * GET is presence-only. POST returns the token once. The Public API uses Bearer,
 * not this cookie route (ADR 0026 / 02).
 *
 * Depends on: @/utils/supabase/server, @/lib/public-api/proxima-api-key
 * Used by: ProximaApiKeySection
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
    hasProximaApiKey,
    mintProximaApiKey,
    revokeProximaApiKey,
} from "@/lib/public-api/proxima-api-key";

async function requireSession() {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) {
        return { supabase: null, user: null };
    }
    return { supabase, user };
}

/** GET /api/account/proxima-api-key — `{ present }` only, never the secret. */
export async function GET() {
    try {
        const { supabase, user } = await requireSession();
        if (!supabase || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const present = await hasProximaApiKey(supabase, user.id);
        return NextResponse.json({ present });
    } catch (error) {
        console.error("proxima-api-key GET error:", error);
        return NextResponse.json({ error: "Failed to check Proxima API key" }, { status: 500 });
    }
}

/** POST /api/account/proxima-api-key — revoke-and-replace; returns `{ key }` once. */
export async function POST() {
    try {
        const { supabase, user } = await requireSession();
        if (!supabase || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const key = await mintProximaApiKey(supabase, user.id);
        if (!key) {
            return NextResponse.json({ error: "Failed to mint Proxima API key" }, { status: 500 });
        }
        return NextResponse.json({ key });
    } catch (error) {
        console.error("proxima-api-key POST error:", error);
        return NextResponse.json({ error: "Failed to mint Proxima API key" }, { status: 500 });
    }
}

/** DELETE /api/account/proxima-api-key — revoke. Presence becomes false. */
export async function DELETE() {
    try {
        const { supabase, user } = await requireSession();
        if (!supabase || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const revoked = await revokeProximaApiKey(supabase, user.id);
        if (!revoked) {
            return NextResponse.json({ error: "Failed to revoke Proxima API key" }, { status: 500 });
        }
        return NextResponse.json({ present: false });
    } catch (error) {
        console.error("proxima-api-key DELETE error:", error);
        return NextResponse.json({ error: "Failed to revoke Proxima API key" }, { status: 500 });
    }
}

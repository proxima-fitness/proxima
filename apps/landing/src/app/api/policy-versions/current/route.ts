// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module policy-versions/current
 *
 * Returns current Terms and Privacy version metadata from `policy_versions`.
 *
 * Depends on: @/utils/supabase/server, @/lib/policy-versions
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentPolicyVersions } from "@/api/policy-versions";

/** GET /api/policy-versions/current - current Terms and Privacy versions. */
export async function GET() {
    try {
        const supabase = await createClient();
        const versions = await getCurrentPolicyVersions(supabase);
        return NextResponse.json(versions);
    } catch (error) {
        console.error("policy-versions/current error:", error);
        return NextResponse.json({ error: "Failed to fetch policy versions" }, { status: 500 });
    }
}

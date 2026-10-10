// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Local dev helper - fetch one Hevy workouts page and import each workout.
 *
 * Loads `.env.local` from the repo root. Uses existing app keys where possible:
 * - `NEXT_PUBLIC_REACT_APP_HEVY_API_KEY` (or `HEVY_API_KEY`)
 * - `NEXT_PUBLIC_REACT_APP_SUPABASE_URL` (or `SUPABASE_URL`)
 * - `SUPABASE_SECRET_KEY`
 *
 * Also add to `.env.local`:
 * - `USER_ID` - Supabase auth UUID for the user to import workouts as
 *
 * Usage (from repo root):
 *   npx tsx src/api/__tests__/manual/import-hevy-workout-page.ts
 *
 * Optional: `HEVY_PAGE`, `HEVY_PAGE_SIZE`
 *
 * Not shipped as an API route (see ADR 01b).
 */
import { resolve } from "path";
import { config } from "dotenv";
import { validate as validateUuid } from "uuid";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { importHevyWorkout } from "../../workout-history";

config({ path: resolve(process.cwd(), ".env.local") });

const page = Number(process.env.HEVY_PAGE ?? "1");
const pageSize = Number(process.env.HEVY_PAGE_SIZE ?? "10");

function requiredEnv(...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) return value;
    }
    return undefined;
}

async function main() {
    const apiKey = requiredEnv("HEVY_API_KEY", "NEXT_PUBLIC_REACT_APP_HEVY_API_KEY");
    const supabaseUrl = requiredEnv("SUPABASE_URL", "NEXT_PUBLIC_REACT_APP_SUPABASE_URL");
    const secretKey = requiredEnv("SUPABASE_SECRET_KEY");
    const userId = requiredEnv("USER_ID", "TEST_USER_ID");

    const missing: string[] = [];
    if (!apiKey) missing.push("HEVY_API_KEY or NEXT_PUBLIC_REACT_APP_HEVY_API_KEY");
    if (!supabaseUrl) missing.push("SUPABASE_URL or NEXT_PUBLIC_REACT_APP_SUPABASE_URL");
    if (!secretKey) missing.push("SUPABASE_SECRET_KEY");
    if (!userId) missing.push("USER_ID or TEST_USER_ID");

    if (missing.length > 0) {
        console.error("Missing in .env.local:\n- " + missing.join("\n- "));
        process.exit(1);
    }

    if (!validateUuid(userId!)) {
        console.error(
            "USER_ID must be a real Supabase auth UUID (Authentication → Users in the dashboard).\n" +
                `Got: ${userId}`,
        );
        process.exit(1);
    }

    const response = await fetch(
        `https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=${pageSize}`,
        {
            headers: {
                accept: "application/json",
                "api-key": apiKey!,
            },
        },
    );

    if (!response.ok) {
        console.error(`Hevy API error: ${response.status} ${response.statusText}`);
        process.exit(1);
    }

    const body = (await response.json()) as THevyWorkoutsResponse;
    const db = createClient<Database>(supabaseUrl!, secretKey!);

    let inserted = 0;
    let skipped = 0;
    let patched = 0;
    let failed = 0;

    for (const workout of body.workouts ?? []) {
        const result = await importHevyWorkout(db, { userId: userId!, workout, apiKey: apiKey! });
        if (result.status === "inserted") inserted += 1;
        else if (result.status === "skipped") skipped += 1;
        else if (result.status === "patched") patched += 1;
        else {
            failed += 1;
            console.error(`Import failed for ${workout.id}: ${result.message}`);
        }
    }

    console.log(
        `Page ${body.page}/${body.page_count}: inserted=${inserted} skipped=${skipped} patched=${patched} failed=${failed}`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

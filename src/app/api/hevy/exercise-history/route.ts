import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getHevyExerciseHistory } from "@/components/program-builder/api/hevy";
import { transformHistoryToExercise } from "@/lib/exerciseStallsTransform";

const CONCURRENCY = 3;
const DELAY_MS = 200;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const requestedIds = body?.exerciseTemplateIds as string[] | undefined;

        const { data: apiKey, error: keyError } = await supabase.rpc("read_secret", {
            secret_name: `hevy_api_key_${user.id}`,
        });

        if (keyError || !apiKey) {
            return NextResponse.json([]);
        }

        const { data: templates, error: templatesError } = await supabase
            .from("hevy_exercise_templates")
            .select("id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment, normalized_title, gif_id, instructions")
            .order("title", { ascending: true });

        if (templatesError || !templates?.length) {
            return NextResponse.json([]);
        }

        const orderedTemplates =
            Array.isArray(requestedIds) && requestedIds.length > 0
                ? requestedIds
                      .map((id) => (templates as THevyExerciseTemplate[]).find((t) => t.id === id))
                      .filter((t): t is THevyExerciseTemplate => t != null)
                : (templates as THevyExerciseTemplate[]);

        const results: TExerciseStallResult[] = [];

        for (let i = 0; i < orderedTemplates.length; i += CONCURRENCY) {
            const chunk = orderedTemplates.slice(i, i + CONCURRENCY);
            const histories = await Promise.all(
                chunk.map(async (ex) => {
                    try {
                        return await getHevyExerciseHistory(apiKey, ex.id);
                    } catch {
                        return { exercise_history: [] };
                    }
                }),
            );
            for (let j = 0; j < chunk.length; j++) {
                results.push(
                    transformHistoryToExercise(chunk[j], histories[j].exercise_history ?? []),
                );
            }
            if (i + CONCURRENCY < orderedTemplates.length) {
                await delay(DELAY_MS);
            }
        }

        return NextResponse.json(results);
    } catch (err) {
        console.error("exercise-history API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

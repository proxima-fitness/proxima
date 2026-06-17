/**
 * @module user-consents
 *
 * Read and write the authenticated user's consent row.
 *
 * Depends on: @/utils/supabase/server, @/lib/policy-versions, @/lib/user-consents
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentPolicyVersions } from "@/api/policy-versions";
import {
    getUserConsents,
    updateOptionalConsents,
    upsertLegalAcceptance,
} from "@/api/user-consents";
import { areVersionIdsCurrent } from "@/lib/policy-versions";

type TPutUserConsentsBody = {
    termsVersionId?: string;
    privacyVersionId?: string;
    platformImprovementOptIn?: boolean;
    marketingOptIn?: boolean;
};

function hasLegalAcceptanceFields(body: TPutUserConsentsBody): boolean {
    return body.termsVersionId !== undefined || body.privacyVersionId !== undefined;
}

function hasOptionalConsentFields(body: TPutUserConsentsBody): boolean {
    return body.platformImprovementOptIn !== undefined || body.marketingOptIn !== undefined;
}

/** GET /api/user-consents — authenticated user's consent row or null. */
export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const consents = await getUserConsents(supabase, user.id);
        return NextResponse.json(consents);
    } catch (error) {
        console.error("user-consents GET error:", error);
        return NextResponse.json({ error: "Failed to fetch user consents" }, { status: 500 });
    }
}

/** PUT /api/user-consents — upsert legal acceptance and/or optional toggles. */
export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as TPutUserConsentsBody;
        const hasLegal = hasLegalAcceptanceFields(body);
        const hasOptional = hasOptionalConsentFields(body);

        if (!hasLegal && !hasOptional) {
            return NextResponse.json({ error: "No consent fields provided" }, { status: 400 });
        }

        if (hasLegal && (!body.termsVersionId || !body.privacyVersionId)) {
            return NextResponse.json(
                { error: "Both termsVersionId and privacyVersionId are required for legal acceptance" },
                { status: 400 },
            );
        }

        if (hasLegal) {
            const currentVersions = await getCurrentPolicyVersions(supabase);
            if (
                !areVersionIdsCurrent(
                    body.termsVersionId!,
                    body.privacyVersionId!,
                    currentVersions,
                )
            ) {
                return NextResponse.json(
                    { error: "Policy versions are stale; refresh and accept current versions" },
                    { status: 409 },
                );
            }

            const optionalUpdates = hasOptional
                ? {
                      platformImprovementOptIn: body.platformImprovementOptIn,
                      marketingOptIn: body.marketingOptIn,
                  }
                : undefined;

            const consents = await upsertLegalAcceptance(
                supabase,
                user.id,
                {
                    termsVersionId: body.termsVersionId!,
                    privacyVersionId: body.privacyVersionId!,
                },
                optionalUpdates,
            );

            return NextResponse.json(consents);
        }

        try {
            const consents = await updateOptionalConsents(supabase, user.id, {
                platformImprovementOptIn: body.platformImprovementOptIn,
                marketingOptIn: body.marketingOptIn,
            });
            return NextResponse.json(consents);
        } catch (error) {
            if (error instanceof Error && error.message === "User consents row not found") {
                return NextResponse.json(
                    { error: "Legal acceptance is required before updating optional consents" },
                    { status: 404 },
                );
            }
            throw error;
        }
    } catch (error) {
        console.error("user-consents PUT error:", error);
        return NextResponse.json({ error: "Failed to update user consents" }, { status: 500 });
    }
}

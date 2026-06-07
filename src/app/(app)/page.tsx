/**
 * @module (app)/page
 *
 * Home page route. Renders the main program-builder prompt and landing sections.
 * Sits at src/app/(app)/page.tsx; entry for "/" within the (app) segment.
 *
 * Depends on: Prompt, landing sections, PositiveReviewsMosaic, PwaSection, createClient (Supabase server).
 * Used by: Next.js (route "/").
 */

import { Prompt } from '@/components/program-builder/shared/Prompt';
import { PositiveReviewsMosaic } from '@/components/features/PositiveReviewsMosaic';
import { PwaSection } from '@/components/features/PwaSection';
import {
    CredibilityBand,
    EditProgramCtaSection,
    HowItWorksSection,
    LandingSection,
    YouTubeReviewSection,
} from '@/components/landing';
import { createClient } from "@/utils/supabase/server";

export function generateStaticParams() {
  return [{ slug: [''] }];
}

/** Server component for the home page. Fetches current user and passes to Prompt. */
export default async function Page() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <>
            <Prompt userData={user} />
            <LandingSection variant="white">
                <YouTubeReviewSection />
            </LandingSection>
            <LandingSection variant="tint">
                <CredibilityBand />
            </LandingSection>
            <LandingSection variant="white">
                <HowItWorksSection />
            </LandingSection>
            <LandingSection id="reddit-reviews" variant="tint">
                <PositiveReviewsMosaic />
            </LandingSection>
            <LandingSection variant="white">
                <EditProgramCtaSection />
            </LandingSection>
            <LandingSection id="pwa" variant="tint">
                <PwaSection />
            </LandingSection>
        </>
    );
}

/**
 * @module (app)/page
 *
 * Home page route. Renders the main program-builder prompt and optional CTA.
 * Sits at src/app/(app)/page.tsx; entry for "/" within the (app) segment.
 *
 * Depends on: Prompt, PwaSection, createClient (Supabase server).
 * Used by: Next.js (route "/").
 */

import { Prompt } from '@/components/program-builder/shared/Prompt';
import { PwaSection } from '@/components/features/PwaSection';
import { createClient } from "@/utils/supabase/server";
// import { CallToAction } from "@/components/call-to-action/CallToAction";
// import styles from "@/style";

export function generateStaticParams() {
  return [{ slug: [''] }];
}

/** Server component for the home page. Fetches current user and passes to Prompt. */
export default async function Page() {

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className={ `bg-white dark:bg-darkGray` }>
            <Prompt userData={ user } />
            <PwaSection />
            {/* Temporarily deprecated - mobile app download */}
            {/* <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <CallToAction />
                </div>
            </div> */}
        </div>
    );
}

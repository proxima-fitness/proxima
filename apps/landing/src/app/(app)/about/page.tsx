// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/about/page
 *
 * About page route. Server shell that passes static image assets to the client
 * About page. Sits at src/app/(app)/about/page.tsx; route "/about".
 *
 * Depends on: AboutPageClient.
 * Used by: Next.js (route "/about").
 */

import { AboutPageClient } from "./AboutPageClient";

export const metadata = {
    title: "About Us | Proxima Fitness",
    description: "Learn more about Proxima Fitness and our mission to empower fitness enthusiasts with AI-driven workout solutions.",
};

/**
 * About page wrapper. Renders the client About content with founder images.
 */
export default function AboutPage() {
    return <AboutPageClient />;
}

/**
 * @module (app)/dashboard/page
 *
 * Dashboard route. Wraps the client dashboard content (programs vault, Hevy
 * grid, blind spot analysis, resume draft). Sits at src/app/(app)/dashboard/page.tsx; route "/dashboard".
 *
 * Depends on: DashboardContent.
 * Used by: Next.js (route "/dashboard").
 */

import { DashboardContent } from "./DashboardContent";

export const metadata = {
    title: "My Dashboard | Proxima Fitness",
    description: "Your dashboard: saved programs and blind spot analysis",
};

/** Dashboard page; delegates to DashboardContent. */
export default function DashboardPage() {
    return <DashboardContent />;
}

// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/contact/page
 *
 * Contact page route. Placeholder layout for the contact screen. Sits at
 * src/app/(app)/contact/page.tsx; route "/contact".
 *
 * Depends on: none (static shell).
 * Used by: Next.js (route "/contact").
 */

export const metadata = {
    title: "Contact Us | Proxima Fitness",
    description: "Get in touch with us",
};

/** Contact page; currently a placeholder. */
export default function ContactPage() {
    return (
        <div className='h-[900px] bg-white flex flex-col items-center justify-center'>
        </div>
    );
}

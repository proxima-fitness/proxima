// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (oauth)/layout
 * Standalone root layout for OAuth consent / decision routes. No app shell —
 * just fonts, theme, and global styles so the consent card matches auth pages.
 * Depends on: global.css, ThemeProvider, next/font.
 * Used by: /oauth/* routes.
 */

import '@/styles/global.css';

import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';
import { Exo, Inter, Russo_One } from 'next/font/google';

export const metadata: Metadata = {
    title: 'Authorize application | Proxima Fitness',
    description: 'Approve or deny access for a third-party application connected to your Proxima account.',
    icons: {
        icon: '/favicon.svg',
        shortcut: '/favicon.svg',
        apple: '/icon-foreground.png',
    },
};

const russo_one = Russo_One({
    weight: ['400'],
    subsets: ['latin'],
    display: 'swap',
});

const exo = Exo({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const inter = Inter({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
});

/**
 * @param props.children - OAuth consent page or nested route content.
 */
export default function OAuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={`${exo.className} ${russo_one.className} ${inter.className}`}
            suppressHydrationWarning
        >
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}

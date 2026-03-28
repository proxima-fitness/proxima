/**
 * @module (app)/layout
 *
 * Root layout for the main app segment. Wraps all (app) routes with fonts,
 * theme, providers (user, Hevy, sidebar, etc.), and main content area.
 * Navigation is sidebar-only at sm and up; at max-sm a minimal mobile header
 * (sidebar trigger + logo) is shown so the sidebar can be opened as a sheet.
 * Sits at src/app/(app)/layout.tsx; wraps every page under (app).
 *
 * Depends on: global.css, QueryProvider, theme/sidebar/context providers, Analytics, Toaster, MobileSidebarHeader, AppSidebar.
 * Used by: All (app) routes as parent layout.
 */

import "@/styles/global.css";

import { Russo_One, Exo, Inter } from "next/font/google";
import QueryProvider from '@/utils/QueryProvider';
import type { Metadata, Viewport } from 'next';
import { Toaster } from "@/components/ui/sonner";
import { IsHevyProvider } from "@/contexts/HevyContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebarDynamic } from "@/components/AppSidebarDynamic";
import { ConditionalFooterDynamic } from "@/components/footer/ConditionalFooterDynamic";
import { MobileSidebarHeader } from "@/components/header/MobileSidebarHeader";
import { Analytics } from "@vercel/analytics/react";
import NextTopLoader from 'nextjs-toploader';
import { PostHogClientProvider } from "@/utils/PostHogClientProvider";
import { UserProvider } from "@/contexts/UserContext";
import { ProfilePictureProvider } from "@/contexts/ProfilePictureContext";
import { ThemeProvider } from "@/components/theme-provider"
import { PoundsOrKgProvider } from "@/contexts/PoundsOrKgContext";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
    title: 'Proxima Fitness | Agentic Workout Builder',
    description: 'Proxima Fitness is an Agentic Workout Builder. This is the Proxima Landing page, where you can sign in to the Proxima Web builder and get started building programs right away.',
    manifest: "/manifest.webmanifest",
    icons: {
        icon: "/favicon.svg", // Use SVG favicon
        shortcut: "/favicon.svg",
        apple: "/icon-foreground.png",
      },
};

const russo_one = Russo_One({
    weight: ["400"],
    subsets: ['latin'],
    display: 'swap',
});

const exo = Exo({
    weight: ["300", "400", "500", "600", "700"],
    subsets: ['latin'],
    display: 'swap',
});

const inter = Inter({
    weight: ["400", "500", "600", "700"],
    subsets: ['latin'],
    display: 'swap',
});


/**
 * Root layout component. Renders html/body with font classes and provider tree.
 *
 * @param props.children - The active (app) page content.
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <html lang="en" className={ `${exo.className} ${russo_one.className} ${inter.className}` } suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" type="image/x-icon" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
(function() {
  try {
    var stored = typeof localStorage !== 'undefined' && localStorage.getItem('theme');
    var dark = stored === 'dark' || (stored !== 'light' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
    var color = dark ? '#000000' : '#ffffff';
    var list = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < list.length; i++) list[i].remove();
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
  } catch (e) {}
})();
                        `.trim(),
                    }}
                />
            </head>
            <body>
                <a
                    href="#main"
                    className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    Skip to main content
                </a>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                <QueryProvider>
                    <UserProvider>
                        <ProfilePictureProvider>
                        <IsHevyProvider>
                            <SidebarProvider defaultOpen={false}>
                                <PoundsOrKgProvider>
                                    <AppSidebarDynamic />
                                    <div className="flex-1 min-w-0 bg-primary">
                                        <MobileSidebarHeader />
                                        <main id="main">
                                            <PostHogClientProvider>
                                                <Analytics />
                                                <NextTopLoader
                                                    showSpinner={ false }
                                                    color="#33bbcf"
                                                />
                                                {children}
                                                <Toaster richColors />
                                            </PostHogClientProvider>
                                        </main>
                                        <ConditionalFooterDynamic />
                                    </div>
                                </PoundsOrKgProvider>
                            </SidebarProvider>
                        </IsHevyProvider>
                        </ProfilePictureProvider>
                    </UserProvider>
                </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
  }

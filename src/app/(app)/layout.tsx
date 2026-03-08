/**
 * @module (app)/layout
 *
 * Root layout for the main app segment. Wraps all (app) routes with fonts,
 * theme, providers (user, Hevy, preview, sidebar, etc.), navbar, and main
 * content area. Sits at src/app/(app)/layout.tsx; wraps every page under (app).
 *
 * Depends on: global.css, Navbar, QueryProvider, theme/sidebar/context providers, Analytics, Toaster.
 * Used by: All (app) routes as parent layout.
 */

import "@/styles/global.css";

import { Russo_One, Exo, Inter } from "next/font/google";
import { Navbar } from '@/components/header/Navbar';
import QueryProvider from '@/utils/QueryProvider';
import styles from '@/style';
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/sonner";
import { IsHevyProvider } from "@/contexts/HevyContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebarDynamic } from "@/components/AppSidebarDynamic";
import { ConditionalFooterDynamic } from "@/components/footer/ConditionalFooterDynamic";
import { Analytics } from "@vercel/analytics/react";
import NextTopLoader from 'nextjs-toploader';
import { LazyPostHogWrapper } from "@/utils/LazyPostHogWrapper";
import { PreviewProvider } from "@/contexts/PreviewContext";
import { UserProvider } from "@/contexts/UserContext";
import { ProfilePictureProvider } from "@/contexts/ProfilePictureContext";
import { ThemeProvider } from "@/components/theme-provider"
import { PoundsOrKgProvider } from "@/contexts/PoundsOrKgContext";

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
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    subsets: ['latin'],
    display: 'swap',
});

const inter = Inter({
    weight: ["300", "400", "500", "600", "700"],
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
                <meta name="theme-color" content="#000000" />
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
                            <PreviewProvider>
                                <SidebarProvider>
                                    <PoundsOrKgProvider>
                                    <div className="max-sm:block hidden">
                                        <AppSidebarDynamic />
                                    </div>
                                    <div className="w-full bg-primary">
                                        <div className={ `${styles.flexCenter}` }>
                                            <div className="w-full">
                                                    <Navbar />
                                            </div>
                                        </div>
                                        <main id="main">
                                            <LazyPostHogWrapper>
                                                <Analytics />
                                                <NextTopLoader
                                                    showSpinner={ false }
                                                    color="#33bbcf"
                                                />

                                                    {children}
                                                    <Toaster richColors />
                                                </LazyPostHogWrapper>
                                        </main>
                                        <ConditionalFooterDynamic />
                                    </div>
                                    </PoundsOrKgProvider>
                                </SidebarProvider>
                            </PreviewProvider>
                        </IsHevyProvider>
                        </ProfilePictureProvider>
                    </UserProvider>
                </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
  }

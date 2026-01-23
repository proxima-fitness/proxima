import "@/styles/global.css";

import { Russo_One, Exo, Inter } from "next/font/google";
import { Navbar } from '@/components/header/Navbar';
import QueryProvider from '@/utils/QueryProvider';
import styles from '@/style';
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/sonner";
import { IsHevyProvider } from "@/contexts/HevyContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Analytics } from "@vercel/analytics/react";
import NextTopLoader from 'nextjs-toploader';
import { PostHogClientProvider } from "@/utils/PostHogClientProvider";
import { PreviewProvider } from "@/contexts/PreviewContext";
import { UserProvider } from "@/contexts/UserContext";
import { ConditionalFooter } from "@/components/footer/ConditionalFooter";
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
    title: 'Proxima Fitness | Agentic Workout Builder',
    description: 'Proxima Fitness is an Agentic Workout Builder. This is the Proxima Landing page, where you can sign in to the Proxima Web builder and get started building programs right away.',
    icons: {
        icon: "/favicon.svg", // Use SVG favicon
        shortcut: "/favicon.svg",
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


export default function RootLayout({
    children,
    }: {
    children: React.ReactNode
    } ) {

    return (
        <html lang="en" className={ `${exo.className} ${russo_one.className} ${inter.className}` } suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" type="image/x-icon" />
                <meta name="theme-color" content="#000000" />
            </head>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                <UserProvider>
                    <QueryProvider>
                        <IsHevyProvider>
                            <PreviewProvider>
                                <SidebarProvider>
                                    <div className="max-sm:block hidden">
                                        <AppSidebar />
                                    </div>
                                    <div className="w-full bg-primary">
                                        <div className={ `${styles.flexCenter}` }>
                                            <div className="w-full">
                                                    <Navbar />
                                            </div>
                                        </div>
                                        <main id="root">
                                            <PostHogClientProvider>
                                                <Analytics />
                                                <NextTopLoader
                                                    showSpinner={ false }
                                                    color="#00f6ff"
                                                />

                                                    {children}
                                                    <Toaster richColors />
                                                </PostHogClientProvider>
                                        </main>
                                        <ConditionalFooter />
                                    </div>
                                </SidebarProvider>
                            </PreviewProvider>
                        </IsHevyProvider>
                    </QueryProvider>
                </UserProvider>
                </ThemeProvider>
            </body>
        </html>
    );
  }

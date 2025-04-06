import "@/styles/global.css";

import { Russo_One, Exo } from "next/font/google";
import { Footer } from '@/components/footer/Footer';
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

export const metadata: Metadata = {
    title: 'Proxima Fitness | AI Workout Builder & Program Directory',
    description: 'Proxima Fitness is an AI Workout Builder and Programs Directory. This is the Proxima Landing page, where you can sign in to the Proxima Web builder and get started building programs right away, or download the Proxima Fitness App on the App Store or Play Store',
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


export default function RootLayout({
    children,
    }: {
    children: React.ReactNode
    } ) {

    return (
        <html lang="en" className={ `${exo.className} ${russo_one.className}` }>
            <head>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <meta name="theme-color" content="#000000" />
            </head>
            <body>
                <SidebarProvider>
                    <div className="max-sm:block hidden">
                        <AppSidebar />
                    </div>
                    <div className="bg-primary w-full overflow-hidden">
                        <div className={ `${styles.paddingXNav} ${styles.flexCenter}` }>
                            <div className={ `${styles.boxWidth}` }>
                                <IsHevyProvider>
                                    <Navbar />
                                </IsHevyProvider>
                            </div>
                        </div>
                        <main id="root">
                            <PostHogClientProvider>
                                <QueryProvider>
                                    <IsHevyProvider>
                                        <Analytics />
                                        <NextTopLoader
                                            showSpinner={ false }
                                            color="#00f6ff"
                                        />
                                        {children}
                                    </IsHevyProvider>
                                    <Toaster richColors />
                                </QueryProvider>
                            </PostHogClientProvider>
                        </main>
                        <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                            <div className={ `${styles.boxWidth}` }>
                                <Footer />
                            </div>
                        </div>
                    </div>
                </SidebarProvider>
            </body>
        </html>
    );
  }

import "@/styles/global.css";

import { Footer } from '@/components/footer/Footer';
import { Navbar } from '@/components/header/Navbar';
import QueryProvider from '@/utils/QueryProvider';
import styles from '@/style';
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: 'Proxima Fitness | AI Workout Builder & Program Directory',
  description: 'Proxima Fitness is an AI Workout Builder and Programs Directory. This is the Proxima Landing page, where you can sign in to the Proxima Web builder and get started building programs right away, or download the Proxima Fitness App on the App Store or Play Store',
};

export default function RootLayout({
    children,
    }: {
    children: React.ReactNode
    } ) {

    return (
        <html lang="en">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Exo:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Titillium+Web:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700&display=swap" rel="stylesheet" />
                <meta name="theme-color" content="#000000" />
            </head>
            <body>
                <div className="bg-primary w-full overflow-hidden">
                    <div className={ `${styles.paddingXNav} ${styles.flexCenter}` }>
                        <div className={ `${styles.boxWidth}` }>
                            <Navbar />
                        </div>
                    </div>
                    <main id="root">
                        <QueryProvider>
                            {children}
                            <Toaster />
                        </QueryProvider>
                    </main>
                    <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                        <div className={ `${styles.boxWidth}` }>
                            <Footer />
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
  }

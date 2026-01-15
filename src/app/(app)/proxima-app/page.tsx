"use client";

import { useUserContext } from "@/contexts/UserContext";
import { Integrations } from"@/components/header/Integrations";
import { useExitIntent } from 'use-exit-intent';
import styles from "@/style";
import { Hero } from "@/components/header/Hero";
import { Stats } from "@/components/header/Stats";
import { ProgramsSection } from "@/components/features/ProgramsSection";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { CustomPrograms } from "@/components/features/CustomPrograms";
import { PersonalRecords } from "@/components/features/PersonalRecords";
import { Themes } from "@/components/features/Themes";
import { Faq } from "@/components/faqs/Faq";
// import { CallToAction } from "@/components/call-to-action/CallToAction";

// export const metadata = {
//     title: "Proxima Fitness App",
//     description: "Start logging your progress with our App",
//   };

  export default function AppPage() {

        const { user } = useUserContext();
    const { registerHandler } = useExitIntent({
        desktop: {
          delayInSecondsToTrigger: 4,
          triggerOnMouseLeave: true,
          triggerOnIdle: true,
          useBeforeUnload: false,
        },
        mobile: {
            delayInSecondsToTrigger: 2,
            triggerOnIdle: true,
          },
      });

    // This handler will be triggered on desktop and mobile
    registerHandler({
      id: 'desktop',
      handler: () => {
        if (!user) {
        //   setIsOpen(true);
        }
      },
      context: ['onDesktop'],
    });

    // This handler will be triggered only on mobile
    registerHandler({
      id: 'mobile',
      handler: () => {
        if (!user) {
        //   setIsMobile(true);
        //   setIsOpen(true);
        //do nothing
        }
      },
      context: ['onMobile'],
    });

    // const [isMobile, setIsMobile] = useState(false);
    // const [isOpen, setIsOpen] = useState(false);

    return (
                <div className={`overflow-hidden`}>
            {/* Temporarily deprecated - mobile app download */}
            {/* {!user && <DownloadPopup isOpen={ isOpen } setIsOpen={ setIsOpen } isMobile={ isMobile } />} */}
            <div className={ `sm:pt-16 pt-6`}>
                <div className={ `bg-primary ${styles.flexStart}` }>
                    <div className={ `${styles.boxWidth}` }>
                        <Hero />
                    </div>
                </div>

                <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                    <div className={ `${styles.boxWidth}` }>
                        <Stats />
                    </div>
                </div>
                <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                    <div className={ `flex flex-row items-center justify-center` }>
                        <Integrations />
                    </div>
                </div>
            </div>
            <div className={ `bg-white dark:bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <ProgramsSection />
                </div>
            </div>
            <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <Testimonials />
                    <CustomPrograms />
                </div>
            </div>
            <div className={ `bg-white dark:bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <PersonalRecords />
                </div>
            </div>
            <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <Themes />
                    <Faq />
                    {/* Temporarily deprecated - mobile app download */}
                    {/* <CallToAction /> */}
                </div>
            </div>
        </div>
    );
}

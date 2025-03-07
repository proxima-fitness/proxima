"use client";

import styles from "./style";
import { useExitIntent } from 'use-exit-intent';
import { DownloadPopup } from "./components/call-to-action/DownloadPopup";
import { useState } from "react";
import { Hero } from "./components/header/Hero";
import { Stats } from "./components/header/Stats";
import { Testimonials } from "./components/testimonials/Testimonials";
import { ProgramsSection } from "./components/features/ProgramsSection";
import { CustomPrograms } from "./components/features/CustomPrograms";
import { PersonalRecords } from "./components/features/PersonalRecords";
import { Themes } from "./components/features/Themes";
import { CallToAction } from "./components/call-to-action/CallToAction";
import { Faq } from "./components/faqs/Faq";

const App = () => {

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
        setIsOpen(true);
      },
      context: ['onDesktop'],
    });

    // This handler will be triggered only on mobile
    registerHandler({
      id: 'mobile',
      handler: () => {
        setIsMobile(true);
        setIsOpen(true);
      },
      context: ['onMobile'],
    });

    const [isMobile, setIsMobile] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <DownloadPopup isOpen={ isOpen } setIsOpen={ setIsOpen } isMobile={ isMobile } />
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
            <div className={ `bg-white ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <ProgramsSection />
                </div>
            </div>
            <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <Testimonials />
                    {/* <FirstVisual /> */}
                    <CustomPrograms />
                </div>
            </div>
            <div className={ `bg-white ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <PersonalRecords />
                </div>
            </div>
            <div className={ `bg-primary ${styles.paddingX} ${styles.flexCenter} flex-col` }>
                <div className={ `${styles.boxWidth}` }>
                    <Themes />
                    {/* <SecondVisual /> */}
                    {/* <Premium /> */}
                    <Faq />
                    <CallToAction />
                </div>
            </div>
        </>
    );
};

export default App;


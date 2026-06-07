/**
 * @module style
 *
 * Centralised Tailwind CSS class-string constants for typography, spacing,
 * layout, and flex utilities used across the landing-page UI. Keeps visual
 * consistency by providing a single set of reusable class compositions
 * rather than scattering raw Tailwind classes throughout components.
 *
 * Depends on: Tailwind CSS (class names resolved at build time)
 * Used by: Layout components, section wrappers, hero/heading elements
 */

const styles = {
    boxWidth: "xl:max-w-[1280px] w-full",

    heading2Centered: `font-main font-semibold xs:text-[48px] text-[40px] flex justify-center items-center text-white xs:leading-[76.8px] text-center md:text-left leading-[66.8px] w-full`,
    heading2End: `font-main font-semibold xs:text-[48px] text-[24px] flex justify-end items-end text-white xs:leading-[76.8px] leading-[66.8px] w-full`,
    heading2: "font-main font-semibold xs:text-[48px] text-[24px] text-black dark:text-white xs:leading-[76.8px] leading-[66.8px] w-full",
    heading2Themes: "font-main font-semibold xs:text-[48px] text-[40px] text-white xs:leading-[76.8px] leading-[66.8px] text-center md:text-left md:pl-[100px] w-full",
    heading2WhiteSection: "font-main font-semibold xs:text-[48px] text-[40px] text-black xs:leading-[76.8px] leading-[66.8px] md:pl-[100px] text-center md:text-left w-full",
    heading2Programs: "font-main font-semibold xs:text-[48px] text-[40px] text-black xs:leading-[76.8px] leading-[66.8px]  text-center md:text-center w-full",

    paragraphHero: "font-tertiary font-normal text-dimWhite ss:text-[15px] text-[14px] leading-[30.8px]",
    paragraph: "font-tertiary font-normal ss:text-[18px] text-[14px] leading-[30.8px]",
    paragraphWhiteSection: "font-tertiary font-normal text-slate-600 ss:text-[18px] text-[14px] leading-[30.8px]",

    flexCenter: "flex justify-center items-center",
    flexStart: "flex justify-center items-start",
    flexEnd: "flex justiy-center items-end",

    paddingX: "sm:px-16 px-6",
    paddingXNav: "sm:px-4 px-6",
    paddingY: "sm:py-16 py-6",
    padding: "sm:px-16 px-6 sm:py-12 py-4",
    paddingsmX: "ml-[20px]",
    marginX: "sm:mx-16 mx-6",
    marginY: "sm:my-16 my-6",
};

export const layout = {
  section: `flex md:flex-row flex-col ${styles.paddingY}`,
  sectionReverse: `flex md:flex-row flex-col-reverse ${styles.paddingY}`,
  sectionTop: `flex md:flex-col flex-col ${styles.paddingY}`,
  sectionImgReverse: `flex-1 flex ${styles.flexCenter} md:mr-10 mr-0 md:mt-0 mt-10 relative`,
  sectionImg: `flex-1 flex ${styles.flexCenter} md:ml-10 ml-0 md:mt-0 mt-10 relative`,
  sectionCarousel: `flex-1 flex ${styles.flexCenter} md:w-1/2 ss:pr-10 ml-0 md:mt-0 mt-10 relative`,

  sectionInfo: `flex-1 ${styles.flexStart} flex-col`,
  sectionInfoReverse: `flex-1 ${styles.flexEnd} flex-col h-[500px]`,
  sectionInfoCentered: `flex-1 ${styles.flexCenter} flex-col`,
  sectionInfoEnd: `flex-1 ${styles.flexEnd} flex-col`,
};

export default styles;


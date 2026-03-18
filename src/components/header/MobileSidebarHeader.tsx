/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * @module MobileSidebarHeader
 * Minimal header shown only at max-sm: sidebar trigger and logo. Lets users open
 * the sidebar sheet on small viewports when the persistent sidebar is hidden.
 * On build-program route, shows Export (StepButton) in the top navbar.
 * Depends on: CustomSidebarTrigger, SidebarProvider (useSidebar), public logo assets, StepButton.
 * Used by: (app) layout.
 */
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { CustomTrigger } from "@/components/CustomSidebarTrigger";
import { proxima_logo_black, proxima_logo_white } from "public";

const StepButton = dynamic(
  () => import("@/components/program-builder/shared/StepButton").then(m => ({ default: m.StepButton })),
  { ssr: false, loading: () => <div className="w-10" aria-hidden /> }
);

export function MobileSidebarHeader() {
  const pathname = usePathname();
  const isBuildProgram = pathname?.startsWith("/build-program") ?? false;

  return (
    <header
      className="sm:hidden w-full flex py-2 justify-between items-center bg-white dark:bg-darkGray sticky top-0 z-50 px-2"
      role="banner"
    >
      <CustomTrigger />
      <Link href="/" className="absolute left-1/2 -translate-x-1/2" aria-label="Proxima home">
        <img
          src={(proxima_logo_black as { src: string }).src}
          alt="Proxima Logo"
          className="h-10 w-auto dark:block hidden"
        />
        <img
          src={(proxima_logo_white as { src: string }).src}
          alt="Proxima Logo"
          className="h-10 w-auto dark:hidden block"
        />
      </Link>
      {isBuildProgram ? (
        <Suspense fallback={<div className="w-10" aria-hidden />}>
          <StepButton />
        </Suspense>
      ) : (
        <div className="w-10" aria-hidden />
      )}
    </header>
  );
}

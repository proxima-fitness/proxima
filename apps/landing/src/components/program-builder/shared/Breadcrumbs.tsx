// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module Breadcrumbs
 * Renders breadcrumb trail (Home → Build Program → mode dropdown: New only, or New+Edit when `hevy=true`) on the build-program route.
 * Depends on: ui/breadcrumb, BuildProgramModeMenu. Used by: build-program layout / toolbar.
 */
"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Suspense } from "react";
import { BuildProgramModeMenu } from "./BuildProgramModeMenu";

export const Breadcrumbs: React.FC = () => {
  const segments = usePathname().split("/").filter(Boolean);
  const isBuildProgram = segments.includes("build-program");

  return (
    <Breadcrumb className="w-full max-sm:hidden">
      <BreadcrumbList>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {isBuildProgram && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/build-program?resume=true">Build Program</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Suspense fallback={<span className="text-sm text-foreground">New</span>}>
                <BuildProgramModeMenu />
              </Suspense>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

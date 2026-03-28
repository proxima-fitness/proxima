// "use client";

// import { usePathname } from "next/navigation";
// import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

// export const Breadcrumbs: React.FC = () => {

//     const path = usePathname();
//     const segments = path.split("/").filter(Boolean);

//     const breadcrumbs: TBreadcrumb[] = [
//         { href: "/program-builder", label: "Program Builder" },
//         ...(segments.includes("build-program") ? [{ href: "/program-builder/build-program", label: "Build Program" }] : []),
//         ...(segments.includes("review-program") ? [{ href: "/program-builder/build-program/review-program", label: "Review Program" }] : []),
//     ];

//     return (
//         <Breadcrumb className="w-[33%]">
//             <BreadcrumbList>
//                 { breadcrumbs.map((bc) => (
//                     <div className="max-sm:text-xs flex flex-row items-center justify-center gap-2" key={ bc.label }>
//                         <BreadcrumbSeparator />
//                         <BreadcrumbItem key={ bc.label }>
//                             <BreadcrumbLink href={ bc.href }>{bc.label}</BreadcrumbLink>
//                         </BreadcrumbItem>
//                     </div>
//                 ))}
//             </BreadcrumbList>
//         </Breadcrumb>
//     );
// };

/**
 * @module Breadcrumbs
 * Renders breadcrumb trail (Home → Build Program when on build-program).
 * Depends on: ui/breadcrumb. Used by: build-program layout / toolbar.
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

export const Breadcrumbs: React.FC = () => {
  const segments = usePathname().split("/").filter(Boolean);

  const breadcrumbs = [
    { href: "/", label: "Home" },
    ...(segments.includes("build-program")
      ? [{ href: "/build-program", label: "Build Program" }]
      : []),
  ];

  return (
    <Breadcrumb className="w-full max-sm:hidden">
      <BreadcrumbList>
        {breadcrumbs.map((bc) => (
          <div
            className="max-sm:text-xs flex flex-row items-center justify-center gap-2"
            key={bc.label}
          >
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={bc.href}>{bc.label}</BreadcrumbLink>
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

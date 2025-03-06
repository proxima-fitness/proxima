"use client";

import { usePathname } from "next/navigation"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"



export const Breadcrumbs: React.FC = () => {

    const path = usePathname();
    const segments = path.split("/").filter(Boolean);

    const breadcrumbs = [
        { href: "/program-builder", label: "Program Builder"},
        segments.includes("build-program") &&
        { href: "/program-builder/build-program", label: "Build Program"},
        segments.includes("review-program") &&
        { href: "/program-builder/build-program/review-program", label: "Review Program"},
    ].filter(Boolean);

    return (
        <Breadcrumb className="w-[33%]">
            <BreadcrumbList>
                { breadcrumbs.map((bc, index) => (
                    <div className="flex flex-row items-center justify-center gap-2" key={ bc.label}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem key={ bc.label }>
                            <BreadcrumbLink href={ bc.href}>{bc.label}</BreadcrumbLink>
                        </BreadcrumbItem>
                    </div>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

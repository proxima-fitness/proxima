/**
 * @module ProgramOverviewCarousel
 *
 * Carousel of per-program Program overviews (ADR 0010). Each slide is one
 * active Proxima program’s overview; swipe/page via react-slick. Week rows /
 * Hevy mirror mount inside the slide via `children`.
 *
 * Depends on: react-slick, slick CSS, Button, lucide chevrons, cn
 * Used by: ProgramOverviewSection
 */

"use client";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./ProgramOverviewCarousel.css";

import type { ReactNode } from "react";
import Slider, { type Settings } from "react-slick";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TSlickArrowProps = {
    className?: string;
    onClick?: () => void;
};

export type TProgramOverviewCarouselItem = {
    id: number;
    title: string;
    programLength: number | null;
    specialization: string[] | null;
};

export type TProgramOverviewCarouselProps = {
    programs: TProgramOverviewCarouselItem[];
    /** Body of each overview slide (week rows, CTAs, Hevy mirror). */
    children?: (program: TProgramOverviewCarouselItem, index: number) => ReactNode;
    className?: string;
};

function formatProgramMeta(program: TProgramOverviewCarouselItem): string | null {
    const parts: string[] = [];
    if (program.programLength != null && program.programLength > 0) {
        parts.push(`${program.programLength}-week`);
    }
    const specialization = program.specialization?.filter(Boolean).join(" · ");
    if (specialization) {
        parts.push(specialization);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
}

function PrevArrow({ onClick, className }: TSlickArrowProps) {
    const disabled = className?.includes("slick-disabled");
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute left-0 top-8 z-10 hidden size-9 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:opacity-30 sm:inline-flex"
            onClick={onClick}
            aria-label="Previous program"
        >
            <ChevronLeft className="size-5" aria-hidden />
        </Button>
    );
}

function NextArrow({ onClick, className }: TSlickArrowProps) {
    const disabled = className?.includes("slick-disabled");
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 top-8 z-10 hidden size-9 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:opacity-30 sm:inline-flex"
            onClick={onClick}
            aria-label="Next program"
        >
            <ChevronRight className="size-5" aria-hidden />
        </Button>
    );
}

/**
 * One overview slide visible; react-slick dots / arrows / swipe when count > 1.
 */
export function ProgramOverviewCarousel({
    programs,
    children,
    className,
}: TProgramOverviewCarouselProps) {
    const count = programs.length;
    if (count === 0) {
        return null;
    }

    const canPage = count > 1;

    const settings: Settings = {
        speed: 400,
        slidesToShow: 1,
        slidesToScroll: 1,
        infinite: false,
        draggable: canPage,
        swipe: canPage,
        dots: canPage,
        arrows: canPage,
        adaptiveHeight: true,
        prevArrow: <PrevArrow />,
        nextArrow: <NextArrow />,
        customPaging: (i) => (
            <button
                type="button"
                aria-label={`Show ${programs[i]?.title ?? `program ${i + 1}`}`}
                className="block size-1.5 rounded-full bg-foreground/20"
            />
        ),
        appendDots: (dots) => (
            <div>
                <ul className="!m-0 flex list-none items-center justify-center gap-1.5 !p-0">
                    {dots}
                </ul>
            </div>
        ),
    };

    return (
        <div
            className={cn(
                "program-overview-carousel relative px-1 py-1 sm:px-10",
                className,
            )}
        >
            <Slider {...settings}>
                {programs.map((program, i) => {
                    const meta = formatProgramMeta(program);
                    return (
                        <div key={program.id} className="px-1 outline-none">
                            <div className="px-1 py-3 text-center sm:py-4">
                                <h3 className="text-balance font-main text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                                    {program.title}
                                </h3>
                                {meta ? (
                                    <p className="mt-1.5 text-sm text-muted-foreground">{meta}</p>
                                ) : null}
                            </div>
                            {children ? (
                                <div
                                    className="mt-2 min-h-[4.5rem] pb-2"
                                    data-program-overview-slot
                                >
                                    {children(program, i)}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </Slider>
        </div>
    );
}

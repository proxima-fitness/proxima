"use client";
/* eslint-disable react-hooks/static-components */

/**
 * @module Shimmer
 *
 * Animated text shimmer effect used to indicate that an AI model is
 * currently "thinking" or streaming content. Renders text with a moving
 * gradient driven by `motion`.
 *
 * Depends on:
 * - `motion` for declarative animation primitives
 * - Utility class merging via `cn`
 *
 * Used by:
 * - `ReasoningTrigger` when showing a live "Thinking..." message
 * - Any surface that needs a reusable, text-only shimmer effect
 */

import type { MotionProps } from "motion/react";
import type { CSSProperties, ElementType, JSX } from "react";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { memo, useMemo } from "react";

type TMotionHTMLProps = MotionProps & Record<string, unknown>;

// Cache motion components at module level to avoid creating during render
const motionComponentCache = new Map<
  keyof JSX.IntrinsicElements,
  React.ComponentType<TMotionHTMLProps>
>();

const getMotionComponent = (element: keyof JSX.IntrinsicElements) => {
  let component = motionComponentCache.get(element);
  if (!component) {
    component = motion.create(element);
    motionComponentCache.set(element, component);
  }
  return component;
};

/**
 * Props for the text shimmer component.
 *
 * - `children` is the text to animate.
 * - `as` selects which HTML element to render.
 * - `duration` and `spread` control the animation timing and gradient
 *   width respectively.
 */
export interface ITextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: ITextShimmerProps) => {
  const MotionComponent = getMotionComponent(
    Component as keyof JSX.IntrinsicElements
  );

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  return (

    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-size-[250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background,hsl(var(--background))),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--color-muted-foreground, hsl(var(--muted-foreground))), var(--color-muted-foreground, hsl(var(--muted-foreground))))",
        } as CSSProperties
      }
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);

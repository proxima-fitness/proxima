/* eslint-disable @next/next/no-img-element */
/**
 * @module Image
 *
 * Lightweight helper for rendering AI-generated images. This component
 * converts base64-encoded image payloads from the `ai` SDK into an inline
 * `<img>` element with sane defaults for sizing and border radius.
 *
 * Depends on:
 * - `Experimental_GeneratedImage` payloads from the `ai` SDK
 * - Utility class merging via `cn`
 *
 * Used by:
 * - AI message flows that stream or attach generated images
 * - Any UI surface that needs to render an inline AI image preview.
 */

import type { Experimental_GeneratedImage } from "ai";

import { cn } from "@/lib/utils";

/**
 * Props for the AI image component.
 *
 * Extends `Experimental_GeneratedImage` with optional `className` for
 * styling and `alt` text for accessibility.
 */
export type TImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
};

/**
 * Render an AI-generated image as an inline `<img>` element using a
 * `data:` URL built from the provided media type and base64 payload.
 */
export const Image = ({
  base64,
  uint8Array: _uint8Array,
  mediaType,
  ...props
}: TImageProps) => (
  <img
    {...props}
    alt={props.alt ?? "Image"}
    className={cn(
      "h-auto max-w-full overflow-hidden rounded-md",
      props.className
    )}
    src={`data:${mediaType};base64,${base64}`}
  />
);

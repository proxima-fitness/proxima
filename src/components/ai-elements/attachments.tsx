/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * @module Attachments
 *
 * High-level attachment primitives for AI chat UIs. This module provides
 * context-aware containers and subcomponents for rendering file and source
 * document attachments in grid, inline, or list layouts, including previews,
 * metadata, removal controls, hover cards, and empty states.
 *
 * Depends on:
 * - `ai` UI parts for file and source document metadata
 * - Design system components such as `Button`, `HoverCard`, and icon primitives
 * - React context and hooks for sharing attachment state across subcomponents
 *
 * Used by:
 * - `PromptTemplate` and AI agent chat flows that need to render attachments
 * - `Chat` / `MessageBubbles` in the program builder agent experience
 * - Other higher-level chat surfaces that want a consistent attachment UI
 */

import type { FileUIPart, SourceDocumentUIPart } from "ai";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  Music2Icon,
  PaperclipIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { createContext, useCallback, useContext, useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

/**
 * Attachment payload supported by the attachment UI.
 *
 * Combines `ai` file and source document parts with a local `id` so that
 * individual attachments can be addressed for removal and list rendering.
 */
export type TAttachmentData =
  | (FileUIPart & { id: string })
  | (SourceDocumentUIPart & { id: string });

/**
 * Coarse media category used to decide which icon, layout, or preview to show.
 *
 * These categories are derived from the underlying `mediaType` or the
 * special `source-document` type.
 */
export type TAttachmentMediaCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "source"
  | "unknown";

export type TAttachmentVariant = "grid" | "inline" | "list";

/**
 * Default icon mapping for each media category. Used when a thumbnail or
 * preview cannot be rendered directly.
 */
const mediaCategoryIcons: Record<TAttachmentMediaCategory, typeof ImageIcon> = {
  audio: Music2Icon,
  document: FileTextIcon,
  image: ImageIcon,
  source: GlobeIcon,
  unknown: PaperclipIcon,
  video: VideoIcon,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Derive a coarse media category from an attachment's metadata.
 *
 * Falls back to `"unknown"` when a media type is not present or cannot be
 * classified into one of the known buckets.
 */
export const getMediaCategory = (
  data: TAttachmentData
): TAttachmentMediaCategory => {
  if (data.type === "source-document") {
    return "source";
  }

  const mediaType = data.mediaType ?? "";

  if (mediaType.startsWith("image/")) {
    return "image";
  }
  if (mediaType.startsWith("video/")) {
    return "video";
  }
  if (mediaType.startsWith("audio/")) {
    return "audio";
  }
  if (mediaType.startsWith("application/") || mediaType.startsWith("text/")) {
    return "document";
  }

  return "unknown";
};

/**
 * Compute a human-readable label for an attachment.
 *
 * Prefers explicit titles and filenames and falls back to a generic label
 * when no descriptive metadata is available.
 */
export const getAttachmentLabel = (data: TAttachmentData): string => {
  if (data.type === "source-document") {
    return data.title || data.filename || "Source";
  }

  const category = getMediaCategory(data);
  return data.filename || (category === "image" ? "Image" : "Attachment");
};

/**
 * Internal helper for rendering image thumbnails in either grid or inline
 * layouts. Keeps sizing and border-radius differences encapsulated.
 */
const renderAttachmentImage = (
  url: string,
  filename: string | undefined,
  isGrid: boolean
) =>
  isGrid ? (
    <img
      alt={filename || "Image"}
      className="size-full object-cover"
      height={96}
      src={url}
      width={96}
    />
  ) : (
    <img
      alt={filename || "Image"}
      className="size-full rounded object-cover"
      height={20}
      src={url}
      width={20}
    />
  );

// ============================================================================
// Contexts
// ============================================================================

interface IAttachmentsContextValue {
  variant: TAttachmentVariant;
}

const AttachmentsContext = createContext<IAttachmentsContextValue | null>(null);

interface IAttachmentContextValue {
  data: TAttachmentData;
  mediaCategory: TAttachmentMediaCategory;
  onRemove?: () => void;
  variant: TAttachmentVariant;
}

const AttachmentContext = createContext<IAttachmentContextValue | null>(null);

// ============================================================================
// Hooks
// ============================================================================

/**
 * Read-only hook that exposes the current attachment layout variant
 * (`"grid"`, `"inline"`, or `"list"`) for child components.
 *
 * Returns `"grid"` when used outside of an `Attachments` provider so that
 * downstream components have a sensible visual default.
 */
export const useAttachmentsContext = () =>
  useContext(AttachmentsContext) ?? { variant: "grid" as const };

/**
 * Hook for accessing the current attachment instance (data, media category,
 * remove handler, and layout variant).
 *
 * This throws when used outside of an `Attachment` so that misuse is caught
 * early during development.
 */
export const useAttachmentContext = () => {
  const ctx = useContext(AttachmentContext);
  if (!ctx) {
    throw new Error("Attachment components must be used within <Attachment>");
  }
  return ctx;
};

// ============================================================================
// Attachments - Container
// ============================================================================

/**
 * Props for the `Attachments` root container.
 *
 * - `variant` controls the layout mode (grid tiles, inline chips, or list rows).
 * - Standard `div` props (e.g., `className`) can be used to integrate with
 *   parent layout and styling.
 */
export type TAttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  variant?: TAttachmentVariant;
};

/**
 * High-level attachment container that provides layout context to all
 * nested attachment components.
 *
 * Use this to wrap one or more `Attachment` children for a given message
 * or prompt input area.
 */
export const Attachments = ({
  variant = "grid",
  className,
  children,
  ...props
}: TAttachmentsProps) => {
  const contextValue = useMemo(() => ({ variant }), [variant]);

  return (
    <AttachmentsContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex items-start",
          variant === "list" ? "flex-col gap-2" : "flex-wrap gap-2",
          variant === "grid" && "ml-auto w-fit",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentsContext.Provider>
  );
};

// ============================================================================
// Attachment - Item
// ============================================================================

/**
 * Props for a single `Attachment` item.
 *
 * - `data` is the file or source document to render.
 * - `onRemove` is an optional callback for removing the attachment from
 *   upstream state; if omitted, remove controls will not be rendered.
 */
export type TAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: TAttachmentData;
  onRemove?: () => void;
};

/**
 * Context provider and visual wrapper for a single attachment.
 *
 * This component is layout-aware and will adjust sizing and interaction
 * affordances based on the current `Attachments` `variant`.
 */
export const Attachment = ({
  data,
  onRemove,
  className,
  children,
  ...props
}: TAttachmentProps) => {
  const { variant } = useAttachmentsContext();
  const mediaCategory = getMediaCategory(data);

  const contextValue = useMemo<IAttachmentContextValue>(
    () => ({ data, mediaCategory, onRemove, variant }),
    [data, mediaCategory, onRemove, variant]
  );

  return (
    <AttachmentContext.Provider value={contextValue}>
      <div
        className={cn(
          "group relative",
          variant === "grid" && "size-24 overflow-hidden rounded-lg",
          variant === "inline" && [
            "flex h-8 cursor-pointer select-none items-center gap-1.5",
            "rounded-md border border-border px-1.5",
            "font-medium text-sm transition-all",
            "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
          ],
          variant === "list" && [
            "flex w-full items-center gap-3 rounded-lg border p-3",
            "hover:bg-accent/50",
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  );
};

// ============================================================================
// AttachmentPreview - Media preview
// ============================================================================

/**
 * Props for the attachment preview thumbnail.
 *
 * - `fallbackIcon` allows callers to override the default media icon when
 *   a thumbnail cannot be shown.
 * - Additional `div` props can be used to control layout around the preview.
 */
export type TAttachmentPreviewProps = HTMLAttributes<HTMLDivElement> & {
  fallbackIcon?: ReactNode;
};

/**
 * Renders an attachment thumbnail or media icon appropriate to the
 * current attachment and layout variant.
 *
 * Images and videos use real media previews when a URL is present;
 * all other categories fall back to an icon.
 */
export const AttachmentPreview = ({
  fallbackIcon,
  className,
  ...props
}: TAttachmentPreviewProps) => {
  const { data, mediaCategory, variant } = useAttachmentContext();

  const iconSize = variant === "inline" ? "size-3" : "size-4";

  const renderIcon = (Icon: typeof ImageIcon) => (
    <Icon className={cn(iconSize, "text-muted-foreground")} />
  );

  const renderContent = () => {
    if (mediaCategory === "image" && data.type === "file" && data.url) {
      return renderAttachmentImage(data.url, data.filename, variant === "grid");
    }

    if (mediaCategory === "video" && data.type === "file" && data.url) {
      return <video className="size-full object-cover" muted src={data.url} />;
    }

    const Icon = mediaCategoryIcons[mediaCategory];
    return fallbackIcon ?? renderIcon(Icon);
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        variant === "grid" && "size-full bg-muted",
        variant === "inline" && "size-5 rounded bg-background",
        variant === "list" && "size-12 rounded bg-muted",
        className
      )}
      {...props}
    >
      {renderContent()}
    </div>
  );
};

// ============================================================================
// AttachmentInfo - Name and type display
// ============================================================================

/**
 * Props for the textual attachment metadata block.
 *
 * - `showMediaType` toggles whether the raw MIME type is displayed
 *   beneath the primary label.
 */
export type TAttachmentInfoProps = HTMLAttributes<HTMLDivElement> & {
  showMediaType?: boolean;
};

/**
 * Displays the attachment label (and optionally media type) alongside
 * the preview. Hidden automatically for grid layouts where text does
 * not fit cleanly.
 */
export const AttachmentInfo = ({
  showMediaType = false,
  className,
  ...props
}: TAttachmentInfoProps) => {
  const { data, variant } = useAttachmentContext();
  const label = getAttachmentLabel(data);

  if (variant === "grid") {
    return null;
  }

  return (
    <div className={cn("min-w-0 flex-1", className)} {...props}>
      <span className="block truncate">{label}</span>
      {showMediaType && data.mediaType && (
        <span className="block truncate text-muted-foreground text-xs">
          {data.mediaType}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// AttachmentRemove - Remove button
// ============================================================================

/**
 * Props for the attachment removal button.
 *
 * - `label` controls the accessible label announced by screen readers;
 *   the visible icon is derived from the slot children.
 * - All standard `Button` props are forwarded for styling and behavior.
 */
export type TAttachmentRemoveProps = ComponentProps<typeof Button> & {
  label?: string;
};

/**
 * Optional remove control that appears when an attachment is removable.
 *
 * The button is visually adapted to the attachment layout and calls the
 * `onRemove` callback supplied to the parent `Attachment`, without bubbling
 * the click event to outer containers.
 */
export const AttachmentRemove = ({
  label = "Remove",
  className,
  children,
  ...props
}: TAttachmentRemoveProps) => {
  const { onRemove, variant } = useAttachmentContext();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    },
    [onRemove]
  );

  if (!onRemove) {
    return null;
  }

  return (
    <Button
      aria-label={label}
      className={cn(
        variant === "grid" && [
          "absolute top-2 right-2 size-6 rounded-full p-0",
          "bg-background/80 backdrop-blur-sm",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "hover:bg-background",
          "[&>svg]:size-3",
        ],
        variant === "inline" && [
          "size-5 rounded p-0",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "[&>svg]:size-2.5",
        ],
        variant === "list" && ["size-8 shrink-0 rounded p-0", "[&>svg]:size-4"],
        className
      )}
      onClick={handleClick}
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <XIcon />}
      <span className="sr-only">{label}</span>
    </Button>
  );
};

// ============================================================================
// AttachmentHoverCard - Hover preview
// ============================================================================

/**
 * Lightweight wrapper around `HoverCard` for attachment previews.
 *
 * Use together with `AttachmentHoverCardTrigger` and
 * `AttachmentHoverCardContent` to build rich hover states for attachments.
 */
export type TAttachmentHoverCardProps = ComponentProps<typeof HoverCard>;

export const AttachmentHoverCard = ({
  openDelay = 0,
  closeDelay = 0,
  ...props
}: TAttachmentHoverCardProps) => (
  <HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />
);

export type TAttachmentHoverCardTriggerProps = ComponentProps<
  typeof HoverCardTrigger
>;

export const AttachmentHoverCardTrigger = (
  props: TAttachmentHoverCardTriggerProps
) => <HoverCardTrigger {...props} />;

export type TAttachmentHoverCardContentProps = ComponentProps<
  typeof HoverCardContent
>;

export const AttachmentHoverCardContent = ({
  align = "start",
  className,
  ...props
}: TAttachmentHoverCardContentProps) => (
  <HoverCardContent
    align={align}
    className={cn("z-9999! w-auto p-2", className)}
    {...props}
  />
);

// ============================================================================
// AttachmentEmpty - Empty state
// ============================================================================

/**
 * Props for the empty-state attachment placeholder.
 *
 * Accepts standard `div` props plus optional children to override the
 * default "No attachments" message.
 */
export type TAttachmentEmptyProps = HTMLAttributes<HTMLDivElement>;

export const AttachmentEmpty = ({
  className,
  children,
  ...props
}: TAttachmentEmptyProps) => (
  <div
    className={cn(
      "flex items-center justify-center p-4 text-muted-foreground text-sm",
      className
    )}
    {...props}
  >
    {children ?? "No attachments"}
  </div>
);

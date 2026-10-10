"use client";

/**
 * @module Conversation
 *
 * Scroll-aware container components for AI chat conversations. This module
 * wraps `StickToBottom` to keep the viewport anchored to the latest message,
 * exposes a structured empty state, and provides utilities for scrolling to
 * the bottom and exporting a transcript as markdown.
 *
 * Depends on:
 * - `use-stick-to-bottom` for scroll anchoring and resize handling
 * - Design system primitives such as `Button`
 * - `useIsMobile` for adapting scroll behavior on small screens
 *
 * Used by:
 * - Program builder agent chat surfaces (`Agent`, `Chat`)
 * - Other AI conversation views that need a consistent scroll and export UX
 */

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ArrowDownIcon, DownloadIcon } from "lucide-react";
import { useCallback } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

/**
 * Props for the root `Conversation` container.
 *
 * Inherits all props from `StickToBottom`, with `className` commonly used
 * to size the chat region within a larger layout.
 */
export type TConversationProps = ComponentProps<typeof StickToBottom>;

/**
 * Top-level conversation container that manages scroll anchoring to the
 * newest messages, with behavior tuned for mobile vs. desktop.
 */
export const Conversation = ({ className, ...props }: TConversationProps) => {
  const isMobile = useIsMobile();
  return (
    <StickToBottom
      className={cn(
        "relative flex-1 overflow-y-hidden max-sm:overflow-y-hidden",
        className
      )}
      role="log"
      {...props}
      initial={isMobile ? "instant" : (props.initial ?? "smooth")}
      resize={isMobile ? "instant" : (props.resize ?? "smooth")}
    />
  );
};

/**
 * Props for the `ConversationContent` region that actually holds message
 * bubbles inside the scroll-managed `Conversation`.
 */
export type TConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: TConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col gap-8 p-4", className)}
    {...props}
  />
);

/**
 * Props for the empty-state view that appears when there are no messages.
 *
 * - `title` and `description` describe the empty conversation.
 * - `icon` and `children` allow callers to fully customize the visual.
 */
export type TConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: TConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

/**
 * Props for the floating "scroll to bottom" button.
 */
export type TConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: TConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        aria-label="Scroll to bottom"
        className={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full dark:bg-background dark:hover:bg-muted",
          className
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};

/**
 * Props for the conversation download button.
 *
 * - `messages` is the chat history to export.
 * - `filename` controls the downloaded markdown filename.
 * - `formatMessage` allows callers to override the markdown formatting
 *   for each message.
 */
export type TConversationDownloadProps = Omit<
  ComponentProps<typeof Button>,
  "onClick"
> & {
  messages: TConversationMessage[];
  filename?: string;
  formatMessage?: (message: TConversationMessage, index: number) => string;
};

const defaultFormatMessage = (message: TConversationMessage): string => {
  const roleLabel =
    message.role.charAt(0).toUpperCase() + message.role.slice(1);
  return `**${roleLabel}:** ${message.content}`;
};

/**
 * Convert a sequence of conversation messages to a markdown string using
 * a caller-provided formatter or the default role-prefixed format.
 */
export const messagesToMarkdown = (
  messages: TConversationMessage[],
  formatMessage: (
    message: TConversationMessage,
    index: number
  ) => string = defaultFormatMessage
): string => messages.map((msg, i) => formatMessage(msg, i)).join("\n\n");

export const ConversationDownload = ({
  messages,
  filename = "conversation.md",
  formatMessage = defaultFormatMessage,
  className,
  children,
  ...props
}: TConversationDownloadProps) => {
  const handleDownload = useCallback(() => {
    const markdown = messagesToMarkdown(messages, formatMessage);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [messages, filename, formatMessage]);

  return (
    <Button
      aria-label="Download conversation"
      className={cn(
        "absolute top-4 right-4 rounded-full dark:bg-background dark:hover:bg-muted",
        className
      )}
      onClick={handleDownload}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      {children ?? <DownloadIcon className="size-4" />}
    </Button>
  );
};

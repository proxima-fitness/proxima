"use client";

/**
 * @module sonner
 * Toast notification container (Sonner) wired to app theme.
 * Depends on: sonner, next-themes.
 * Used by: app layout root for success/error/promise toasts.
 */
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

/** Props forwarded to Sonner; theme derived from useTheme. */
type TToasterProps = React.ComponentProps<typeof Sonner>;

/** Renders Sonner with theme and app-specific toast classNames. */
const Toaster = ({ ...props }: TToasterProps) => {
  const { theme = "system" } = useTheme();

    return (
        <Sonner
            theme={ theme as TToasterProps["theme"] }
            className="toaster group"
            toastOptions={ {
                classNames: {
                toast:
                    "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                description: "group-[.toast]:text-muted-foreground",
                actionButton:
                    "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                cancelButton:
                    "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
        } }
      { ...props }
    />
  );
};

export { Toaster };

/**
 * @module ConsentSwitch
 *
 * iOS-style toggle for optional consent preferences.
 * Used by OptionalConsentPreferences and PrivacySettingsContent.
 */
"use client";

import { cn } from "@/lib/utils";

interface IConsentSwitchProps {
    id: string;
    checked: boolean;
    disabled?: boolean;
    size?: "default" | "sm";
    onCheckedChange: (checked: boolean) => void;
}

/** Optional consent toggle switch. */
export function ConsentSwitch({
    id,
    checked,
    disabled,
    size = "default",
    onCheckedChange,
}: IConsentSwitchProps) {
    const isSmall = size === "sm";

    return (
        <button
            type="button"
            role="switch"
            id={id}
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                isSmall ? "h-5 w-9" : "h-6 w-11",
                checked ? "bg-lightSecondary" : "bg-input",
            )}
        >
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
                    isSmall ? "h-4 w-4" : "h-5 w-5",
                    checked ? (isSmall ? "translate-x-4" : "translate-x-5") : "translate-x-0",
                )}
            />
        </button>
    );
}

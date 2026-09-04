/**
 * @module OptionalConsentPreferences
 *
 * Grouped optional consent toggles (Settings-style inset panel).
 * Separates optional preferences from required legal agreement.
 *
 * Depends on: ConsentSwitch, optional-consent-copy
 * Used by: LegalAcceptanceDialog
 */
"use client";

import { ConsentSwitch } from "@/components/legal/ConsentSwitch";
import { Label } from "@/components/ui/label";
import {
    MARKETING_CONSENT,
    PLATFORM_IMPROVEMENT_CONSENT,
} from "@/content/optional-consent-copy";

interface IOptionalConsentRowProps {
    id: string;
    label: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
}

function OptionalConsentRow({
    id,
    label,
    checked,
    disabled,
    onCheckedChange,
}: IOptionalConsentRowProps) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2">
            <Label htmlFor={id} className="cursor-pointer text-xs font-normal leading-snug">
                {label}
            </Label>
            <ConsentSwitch
                id={id}
                size="sm"
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}

interface IOptionalConsentPreferencesProps {
    idPrefix: string;
    platformImprovementOptIn: boolean;
    marketingOptIn: boolean;
    onPlatformImprovementChange: (checked: boolean) => void;
    onMarketingChange: (checked: boolean) => void;
    disabled?: boolean;
}

/** Inset panel for optional platform improvement and marketing preferences. */
export function OptionalConsentPreferences({
    idPrefix,
    platformImprovementOptIn,
    marketingOptIn,
    onPlatformImprovementChange,
    onMarketingChange,
    disabled = false,
}: IOptionalConsentPreferencesProps) {
    return (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
            <div className="border-b border-border/60 px-3 py-1.5">
                <p className="text-[11px] text-muted-foreground/80">
                    Change anytime in Privacy settings.
                </p>
            </div>
            <div className="divide-y divide-border/60">
                <OptionalConsentRow
                    id={`${idPrefix}-platform-improvement`}
                    label={PLATFORM_IMPROVEMENT_CONSENT.label}
                    checked={platformImprovementOptIn}
                    disabled={disabled}
                    onCheckedChange={onPlatformImprovementChange}
                />
                <OptionalConsentRow
                    id={`${idPrefix}-marketing`}
                    label={MARKETING_CONSENT.label}
                    checked={marketingOptIn}
                    disabled={disabled}
                    onCheckedChange={onMarketingChange}
                />
            </div>
        </div>
    );
}

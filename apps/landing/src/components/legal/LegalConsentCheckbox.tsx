// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module LegalConsentCheckbox
 *
 * Shared required legal agreement checkbox.
 *
 * Depends on: Checkbox, Label
 * Used by: LegalAcceptanceDialog
 */
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ILegalConsentCheckboxProps {
    id?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}

/** Required Terms + Privacy agreement control. */
export function LegalConsentCheckbox({
    id = "legal-consent",
    checked,
    onCheckedChange,
    disabled = false,
}: ILegalConsentCheckboxProps) {
    return (
        <div className="flex items-center gap-3">
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => onCheckedChange(value === true)}
                className="data-[state=checked]:border-lightSecondary data-[state=checked]:bg-lightSecondary data-[state=checked]:text-white"
            />
            <Label htmlFor={id} className="cursor-pointer font-normal leading-snug text-sm">
                I have read and agree to the Terms of Use and Privacy Policy above.
            </Label>
        </div>
    );
}

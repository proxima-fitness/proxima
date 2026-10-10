// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module account/TrainingProfileSection
 *
 * Self-contained Training profile editor. Local draft + dedicated Save training
 * profile. Reports dirty via onDirtyChange for page leave warn. Unmounted until SP10.
 *
 * Depends on: useUserTrainingProfile, saveUserTrainingProfile, draft/options helpers, UI
 * Used by: EditProfileContent (SP10)
 */

import { useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { saveUserTrainingProfile } from "@/api/user-training-profile";
import { useUserTrainingProfile } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
    cloneTrainingProfileDraft,
    heightCmToImperial,
    imperialToHeightCm,
    isTrainingProfileDraftDirty,
    parseOptionalInt,
    seedTrainingProfileDraft,
} from "./training-profile-draft";
import {
    TRAINING_ACTIVITY_LEVEL_OPTIONS,
    TRAINING_AGE_OPTIONS,
    TRAINING_EXPERIENCE_OPTIONS,
    TRAINING_FOCUS_OPTIONS,
    TRAINING_HEIGHT_CM_OPTIONS,
    TRAINING_HEIGHT_FEET_OPTIONS,
    TRAINING_HEIGHT_INCHES_OPTIONS,
    TRAINING_PHYSIQUE_PHASE_OPTIONS,
    TRAINING_PROFILE_UNSET_VALUE,
    TRAINING_SESSION_DURATION_OPTIONS,
    TRAINING_SEX_OPTIONS,
    catalogToSelectValue,
    selectValueToCatalog,
    type THeightUnit,
} from "./training-profile-options";

const INSET_GROUP_CLASS =
    "overflow-visible rounded-lg border border-border/60 bg-muted";

interface ISettingsGroupProps {
    caption: string;
    description?: string;
    children: ReactNode;
}

/** Caption + inset panel (iOS Settings-style grouped list). */
function SettingsGroup({ caption, description, children }: ISettingsGroupProps) {
    return (
        <div className="space-y-2">
            <div className="space-y-0.5 px-0.5">
                <p className="text-xs font-medium text-muted-foreground">{caption}</p>
                {description ? (
                    <p className="text-xs text-muted-foreground/80">{description}</p>
                ) : null}
            </div>
            <div className={INSET_GROUP_CLASS}>{children}</div>
        </div>
    );
}

interface IFieldRowProps {
    id: string;
    label: string;
    children: ReactNode;
}

function FieldRow({ id, label, children }: IFieldRowProps) {
    return (
        <div
            data-testid="training-profile-field-row"
            className="flex flex-col items-stretch gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5"
        >
            <Label
                htmlFor={id}
                className="shrink-0 text-sm font-normal leading-snug sm:min-w-0 sm:flex-1"
            >
                {label}
            </Label>
            <div className="w-full shrink-0 sm:w-[min(100%,14rem)]">{children}</div>
        </div>
    );
}

interface ICatalogSelectProps {
    id: string;
    value: string;
    options: TSelectOption[];
    includeUnset?: boolean;
    unsetLabel?: string;
    onChange: (value: string) => void;
}

function CatalogSelect({
    id,
    value,
    options,
    includeUnset = true,
    unsetLabel = "Not set",
    onChange,
}: ICatalogSelectProps) {
    const selectValue = catalogToSelectValue(value);

    return (
        <Select value={selectValue} onValueChange={onChange}>
            <SelectTrigger id={id} className="w-full bg-background">
                <SelectValue placeholder={unsetLabel} />
            </SelectTrigger>
            <SelectContent>
                {includeUnset ? (
                    <SelectItem value={TRAINING_PROFILE_UNSET_VALUE}>
                        {unsetLabel}
                    </SelectItem>
                ) : null}
                {options
                    .filter((opt) => opt.value !== TRAINING_PROFILE_UNSET_VALUE)
                    .map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
            </SelectContent>
        </Select>
    );
}

export interface ITrainingProfileSectionProps {
    user: User;
    /** Called whenever draft dirty state changes (for page leave warn). */
    onDirtyChange?: (isDirty: boolean) => void;
    onSaveSuccess?: () => void;
}

interface ITrainingProfileEditorProps {
    userId: string;
    initialProfile: TTrainingProfile;
    onDirtyChange?: (isDirty: boolean) => void;
    onSaveSuccess?: () => void;
}

/**
 * Draft editor keyed by parent so state re-inits from `initialProfile` on remount
 * (no prop→state sync effects).
 */
function TrainingProfileEditor({
    userId,
    initialProfile,
    onDirtyChange,
    onSaveSuccess,
}: ITrainingProfileEditorProps) {
    const queryClient = useQueryClient();
    const [baseline, setBaseline] = useState(() =>
        cloneTrainingProfileDraft(initialProfile),
    );
    const [draft, setDraft] = useState(() =>
        cloneTrainingProfileDraft(initialProfile),
    );
    const [heightUnit, setHeightUnit] = useState<THeightUnit>("metric");

    const isDirty = isTrainingProfileDraftDirty(baseline, draft);
    const imperial = heightCmToImperial(draft.heightCm);

    const saveMutation = useMutation({
        mutationFn: async (profile: TTrainingProfile) => {
            await saveUserTrainingProfile(userId, profile);
            return profile;
        },
        onSuccess: async (saved) => {
            const next = cloneTrainingProfileDraft(saved);
            setBaseline(next);
            setDraft(next);
            onDirtyChange?.(false);
            await queryClient.invalidateQueries({
                queryKey: ["user-training-profile", userId],
            });
            toast.success("Training profile saved");
            onSaveSuccess?.();
        },
        onError: (error) => {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save Training profile",
            );
        },
    });

    const updateDraft = (updater: (current: TTrainingProfile) => TTrainingProfile) => {
        const next = updater(draft);
        setDraft(next);
        onDirtyChange?.(isTrainingProfileDraftDirty(baseline, next));
    };

    const handleCatalogChange = <K extends keyof TTrainingProfile>(
        key: K,
        selectValue: string,
    ) => {
        const catalog = selectValueToCatalog(selectValue);
        updateDraft((current) => ({
            ...current,
            [key]: catalog as TTrainingProfile[K],
        }));
    };

    const handleAgeChange = (selectValue: string) => {
        updateDraft((current) => ({
            ...current,
            age: parseOptionalInt(selectValueToCatalog(selectValue)),
        }));
    };

    const handleSessionDurationChange = (selectValue: string) => {
        updateDraft((current) => ({
            ...current,
            sessionDurationMin: parseOptionalInt(selectValueToCatalog(selectValue)),
        }));
    };

    const handleMetricHeightChange = (selectValue: string) => {
        updateDraft((current) => ({
            ...current,
            heightCm: parseOptionalInt(selectValueToCatalog(selectValue)),
        }));
    };

    const handleFeetChange = (selectValue: string) => {
        const feet = parseOptionalInt(selectValueToCatalog(selectValue));
        updateDraft((current) => ({
            ...current,
            heightCm: imperialToHeightCm(feet, imperial.inches ?? 0),
        }));
    };

    const handleInchesChange = (selectValue: string) => {
        const inches = parseOptionalInt(selectValueToCatalog(selectValue));
        updateDraft((current) => ({
            ...current,
            heightCm: imperialToHeightCm(imperial.feet ?? 5, inches),
        }));
    };

    const handleSave = (event: FormEvent) => {
        event.preventDefault();
        if (!isDirty || saveMutation.isPending) return;
        saveMutation.mutate(draft);
    };

    const handleReset = () => {
        if (!isDirty || saveMutation.isPending) return;
        const next = cloneTrainingProfileDraft(baseline);
        setDraft(next);
        onDirtyChange?.(false);
    };

    return (
        <form
            className="space-y-6"
            onSubmit={handleSave}
            noValidate
            data-testid="training-profile-editor"
        >
            <SettingsGroup caption="Person">
                <div className="divide-y divide-border/60">
                    <FieldRow id="training-age" label="Age">
                        <CatalogSelect
                            id="training-age"
                            value={draft.age == null ? "" : String(draft.age)}
                            options={TRAINING_AGE_OPTIONS}
                            onChange={handleAgeChange}
                        />
                    </FieldRow>
                    <FieldRow id="training-sex" label="Sex">
                        <CatalogSelect
                            id="training-sex"
                            value={draft.sex}
                            options={TRAINING_SEX_OPTIONS}
                            unsetLabel="Prefer not to say"
                            onChange={(value) => handleCatalogChange("sex", value)}
                        />
                    </FieldRow>
                    <div
                        data-testid="training-profile-height-row"
                        className="space-y-3 px-3 py-3"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Label className="text-sm font-normal">Height</Label>
                            <ToggleGroup
                                type="single"
                                value={heightUnit}
                                onValueChange={(value) => {
                                    if (value === "imperial" || value === "metric") {
                                        setHeightUnit(value);
                                    }
                                }}
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                aria-label="Height unit"
                            >
                                <ToggleGroupItem value="metric" aria-label="Metric">
                                    Metric
                                </ToggleGroupItem>
                                <ToggleGroupItem value="imperial" aria-label="Imperial">
                                    Imperial
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                        {heightUnit === "metric" ? (
                            <CatalogSelect
                                id="training-height-cm"
                                value={
                                    draft.heightCm == null
                                        ? ""
                                        : String(Math.round(draft.heightCm))
                                }
                                options={TRAINING_HEIGHT_CM_OPTIONS}
                                onChange={handleMetricHeightChange}
                            />
                        ) : (
                            <div className="flex gap-2">
                                <CatalogSelect
                                    id="training-height-ft"
                                    value={
                                        imperial.feet == null
                                            ? ""
                                            : String(imperial.feet)
                                    }
                                    options={TRAINING_HEIGHT_FEET_OPTIONS}
                                    onChange={handleFeetChange}
                                />
                                <CatalogSelect
                                    id="training-height-in"
                                    value={
                                        imperial.inches == null
                                            ? ""
                                            : String(imperial.inches)
                                    }
                                    options={TRAINING_HEIGHT_INCHES_OPTIONS}
                                    onChange={handleInchesChange}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </SettingsGroup>

            <SettingsGroup caption="Training">
                <div className="divide-y divide-border/60">
                    <FieldRow id="training-experience" label="Experience level">
                        <CatalogSelect
                            id="training-experience"
                            value={draft.experienceLevel}
                            options={TRAINING_EXPERIENCE_OPTIONS}
                            onChange={(value) =>
                                handleCatalogChange("experienceLevel", value)
                            }
                        />
                    </FieldRow>
                    <FieldRow id="training-physique" label="Physique phase">
                        <CatalogSelect
                            id="training-physique"
                            value={draft.physiquePhase}
                            options={TRAINING_PHYSIQUE_PHASE_OPTIONS}
                            onChange={(value) =>
                                handleCatalogChange("physiquePhase", value)
                            }
                        />
                    </FieldRow>
                    <FieldRow id="training-focus" label="Training focus">
                        <CatalogSelect
                            id="training-focus"
                            value={draft.trainingFocus}
                            options={TRAINING_FOCUS_OPTIONS}
                            onChange={(value) =>
                                handleCatalogChange("trainingFocus", value)
                            }
                        />
                    </FieldRow>
                    <FieldRow id="training-activity" label="Activity level">
                        <CatalogSelect
                            id="training-activity"
                            value={draft.activityLevel}
                            options={TRAINING_ACTIVITY_LEVEL_OPTIONS}
                            onChange={(value) =>
                                handleCatalogChange("activityLevel", value)
                            }
                        />
                    </FieldRow>
                    <FieldRow id="training-session" label="Session duration">
                        <CatalogSelect
                            id="training-session"
                            value={
                                draft.sessionDurationMin == null
                                    ? ""
                                    : String(draft.sessionDurationMin)
                            }
                            options={TRAINING_SESSION_DURATION_OPTIONS}
                            onChange={handleSessionDurationChange}
                        />
                    </FieldRow>
                </div>
            </SettingsGroup>

            <div className="mt-2 flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    variant="ghost"
                    disabled={!isDirty || saveMutation.isPending}
                    onClick={handleReset}
                >
                    Reset
                </Button>
                <Button
                    type="submit"
                    disabled={!isDirty || saveMutation.isPending}
                    className="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                >
                    {saveMutation.isPending ? "Saving…" : "Save training profile"}
                </Button>
            </div>
        </form>
    );
}

/** Loads Training profile; always shows editor (empty draft when no row). */
export function TrainingProfileSection({
    user,
    onDirtyChange,
    onSaveSuccess,
}: ITrainingProfileSectionProps) {
    const { data, isLoading, isError } = useUserTrainingProfile(user);

    if (isLoading) {
        return (
            <div className="flex min-h-32 items-center justify-center">
                <Spinner size="medium" />
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-sm text-destructive">
                Could not load Training profile. Try again later.
            </p>
        );
    }

    return (
        <TrainingProfileEditor
            key={user.id}
            userId={user.id}
            initialProfile={seedTrainingProfileDraft(data)}
            onDirtyChange={onDirtyChange}
            onSaveSuccess={onSaveSuccess}
        />
    );
}

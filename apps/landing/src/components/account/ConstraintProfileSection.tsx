// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module account/ConstraintProfileSection
 *
 * Self-contained Constraint profile editor. Empty-state card when no constraints;
 * otherwise local draft + dedicated Save constraints. Reports dirty via onDirtyChange
 * for page leave warn.
 *
 * Depends on: useUserConstraints, saveUserConstraintProfile, draft/options helpers, UI
 * Used by: EditProfileContent
 */

import {
    useState,
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
    saveUserConstraintProfile,
    type TUserConstraintProfileRecord,
} from "@/api/user-constraints";
import { useUserConstraints } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MultiSelect from "@/components/ui/multi-select";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { isConstraintProfileEmpty } from "@/lib/constraint-profile-view";

import {
    addFreeformItem,
    cloneConstraintProfileDraft,
    isConstraintProfileDraftDirty,
    removeItemAt,
    setPreferenceValue,
} from "./constraint-profile-draft";
import {
    CONSTRAINT_EXCLUDED_AREA_OPTIONS,
    CONSTRAINT_EXCLUDED_EQUIPMENT_OPTIONS,
    CONSTRAINT_PREFERENCE_FIELDS,
    CONSTRAINT_PREFERENCE_OPTIONS,
    CONSTRAINT_PREFERENCE_UNSET_VALUE,
    resolveSelectOption,
    selectOptionsToValues,
    valuesToSelectOptions,
    type TConstraintPreferenceKey,
} from "./constraint-profile-options";

/** True when nothing to edit - structured empty and no raw statements. */
function isConstraintSectionEmpty(
    record: TUserConstraintProfileRecord | null | undefined,
): boolean {
    if (!record) return true;
    if (!isConstraintProfileEmpty(record)) return false;
    return record.rawStatements.length === 0;
}

/** Narrows to a record with at least one editable field. */
function hasEditableConstraints(
    record: TUserConstraintProfileRecord | null | undefined,
): record is TUserConstraintProfileRecord {
    return !isConstraintSectionEmpty(record);
}

function ConstraintProfileEmptyState() {
    return (
        <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center"
            data-testid="constraint-profile-empty-state"
        >
            <p className="text-sm font-medium text-foreground">No constraints yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                Your constraints will appear here as Proxima learns about your health goals
            </p>
        </div>
    );
}

export interface IConstraintProfileSectionProps {
    user: User;
    /** Called whenever draft dirty state changes (for page leave warn). */
    onDirtyChange?: (isDirty: boolean) => void;
    onSaveSuccess?: () => void;
}

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

interface IFreeformChipListProps {
    id: string;
    label: string;
    items: string[];
    placeholder: string;
    onChange: (items: string[]) => void;
}

function FreeformChipList({
    id,
    label,
    items,
    placeholder,
    onChange,
}: IFreeformChipListProps) {
    const [draftText, setDraftText] = useState("");

    const commit = () => {
        const next = addFreeformItem(items, draftText);
        if (next !== items) {
            onChange(next);
            setDraftText("");
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            commit();
        }
    };

    return (
        <div className="space-y-3 p-3">
            <Label htmlFor={id} className="sr-only">
                {label}
            </Label>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item, index) => (
                        <Badge
                            key={`${item}-${index}`}
                            variant="secondary"
                            className="gap-1 pr-1 font-normal"
                        >
                            <span>{item}</span>
                            <button
                                type="button"
                                className="rounded-sm p-0.5 hover:bg-muted"
                                aria-label={`Remove ${item}`}
                                onClick={() => onChange(removeItemAt(items, index))}
                            >
                                <X className="h-3 w-3" aria-hidden />
                            </button>
                        </Badge>
                    ))}
                </div>
            ) : null}
            <div className="flex min-w-0 items-center gap-2">
                <Input
                    id={id}
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    containerClassName="min-w-0 flex-1"
                    className="bg-background"
                />
                <Button type="button" variant="ghost" className="shrink-0" onClick={commit}>
                    Add
                </Button>
            </div>
        </div>
    );
}

interface IRawStatementsListProps {
    items: string[];
    onChange: (items: string[]) => void;
}

function RawStatementsList({ items, onChange }: IRawStatementsListProps) {
    if (items.length === 0) {
        return (
            <p className="px-3 py-3 text-sm text-muted-foreground">
                No raw statements yet.
            </p>
        );
    }

    return (
        <ul className="divide-y divide-border/60">
            {items.map((item, index) => (
                <li
                    key={`${item}-${index}`}
                    className="flex items-start justify-between gap-2 px-3 py-2.5 text-sm sm:gap-3"
                >
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                        {item}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground"
                        aria-label={`Delete raw statement ${index + 1}`}
                        onClick={() => onChange(removeItemAt(items, index))}
                    >
                        Delete
                    </Button>
                </li>
            ))}
        </ul>
    );
}

interface IConstraintProfileEditorProps {
    userId: string;
    initialRecord: TUserConstraintProfileRecord;
    onDirtyChange?: (isDirty: boolean) => void;
    onSaveSuccess?: () => void;
}

/**
 * Draft editor keyed by parent so state re-inits from `initialRecord` on remount
 * (no prop→state sync effects).
 */
function ConstraintProfileEditor({
    userId,
    initialRecord,
    onDirtyChange,
    onSaveSuccess,
}: IConstraintProfileEditorProps) {
    const queryClient = useQueryClient();
    const [baseline, setBaseline] = useState(() =>
        cloneConstraintProfileDraft(initialRecord),
    );
    const [draft, setDraft] = useState(() =>
        cloneConstraintProfileDraft(initialRecord),
    );

    const isDirty = isConstraintProfileDraftDirty(baseline, draft);

    const saveMutation = useMutation({
        mutationFn: async (record: TUserConstraintProfileRecord) => {
            await saveUserConstraintProfile(userId, record);
            return record;
        },
        onSuccess: async (saved) => {
            const next = cloneConstraintProfileDraft(saved);
            setBaseline(next);
            setDraft(next);
            onDirtyChange?.(false);
            await queryClient.invalidateQueries({
                queryKey: ["user-constraints", userId],
            });
            toast.success("Constraints saved");
            onSaveSuccess?.();
        },
        onError: (error) => {
            toast.error(
                error instanceof Error ? error.message : "Failed to save constraints",
            );
        },
    });

    const updateDraft = (
        updater: (current: TUserConstraintProfileRecord) => TUserConstraintProfileRecord,
    ) => {
        const next = updater(draft);
        setDraft(next);
        onDirtyChange?.(isConstraintProfileDraftDirty(baseline, next));
    };

    const handlePreferenceChange = (
        key: TConstraintPreferenceKey,
        selectValue: string,
    ) => {
        const value =
            selectValue === CONSTRAINT_PREFERENCE_UNSET_VALUE ? "" : selectValue;
        updateDraft((current) => ({
            ...current,
            preferences: setPreferenceValue(current.preferences, key, value),
        }));
    };

    const handleSave = (event: FormEvent) => {
        event.preventDefault();
        if (!isDirty || saveMutation.isPending) return;
        saveMutation.mutate(draft);
    };

    const handleReset = () => {
        if (!isDirty || saveMutation.isPending) return;
        const next = cloneConstraintProfileDraft(baseline);
        setDraft(next);
        onDirtyChange?.(false);
    };

    return (
        <form className="space-y-6" onSubmit={handleSave} noValidate>
            <SettingsGroup caption="Injuries & health issues">
                <FreeformChipList
                    id="constraint-injuries"
                    label="Injuries & health issues"
                    items={draft.injuries}
                    placeholder="Add an injury or movement restriction"
                    onChange={(injuries) =>
                        updateDraft((current) => ({ ...current, injuries }))
                    }
                />
            </SettingsGroup>

            <SettingsGroup caption="Equipment & areas">
                <div className="divide-y divide-border/60">
                    <div className="space-y-2 p-3">
                        <Label
                            htmlFor="constraint-excluded-equipment"
                            className="text-sm font-normal"
                        >
                            Excluded equipment
                        </Label>
                        <MultiSelect
                            defaultOptions={CONSTRAINT_EXCLUDED_EQUIPMENT_OPTIONS}
                            options={CONSTRAINT_EXCLUDED_EQUIPMENT_OPTIONS}
                            value={valuesToSelectOptions(
                                draft.excludedEquipment,
                                CONSTRAINT_EXCLUDED_EQUIPMENT_OPTIONS,
                            )}
                            onChange={(options) =>
                                updateDraft((current) => ({
                                    ...current,
                                    excludedEquipment: selectOptionsToValues(options),
                                }))
                            }
                            placeholder="Select equipment to exclude"
                            hidePlaceholderWhenSelected
                            emptyIndicator={
                                <p className="text-center text-sm text-muted-foreground">
                                    No equipment found
                                </p>
                            }
                            inputProps={{ id: "constraint-excluded-equipment" }}
                        />
                    </div>
                    <div className="space-y-2 p-3">
                        <Label
                            htmlFor="constraint-excluded-areas"
                            className="text-sm font-normal"
                        >
                            Excluded areas
                        </Label>
                        <MultiSelect
                            defaultOptions={CONSTRAINT_EXCLUDED_AREA_OPTIONS}
                            options={CONSTRAINT_EXCLUDED_AREA_OPTIONS}
                            value={valuesToSelectOptions(
                                draft.excludedAreas,
                                CONSTRAINT_EXCLUDED_AREA_OPTIONS,
                            )}
                            onChange={(options) =>
                                updateDraft((current) => ({
                                    ...current,
                                    excludedAreas: selectOptionsToValues(options),
                                }))
                            }
                            placeholder="Select areas to exclude"
                            hidePlaceholderWhenSelected
                            emptyIndicator={
                                <p className="text-center text-sm text-muted-foreground">
                                    No areas found
                                </p>
                            }
                            inputProps={{ id: "constraint-excluded-areas" }}
                        />
                    </div>
                </div>
            </SettingsGroup>

            <SettingsGroup caption="Preferences">
                <div className="divide-y divide-border/60">
                    {CONSTRAINT_PREFERENCE_FIELDS.map(({ key, label }) => {
                        const options = CONSTRAINT_PREFERENCE_OPTIONS[key];
                        const current = draft.preferences[key];
                        const selectValue = current
                            ? current
                            : CONSTRAINT_PREFERENCE_UNSET_VALUE;
                        const orphan =
                            current &&
                            !options.some((opt) => opt.value === current)
                                ? resolveSelectOption(current, options)
                                : null;

                        return (
                            <div
                                key={key}
                                data-testid="constraint-preference-row"
                                className="flex flex-col items-stretch gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5"
                            >
                                <Label
                                    htmlFor={`constraint-pref-${key}`}
                                    className="shrink-0 text-sm font-normal leading-snug sm:min-w-0 sm:flex-1"
                                >
                                    {label}
                                </Label>
                                <Select
                                    value={selectValue}
                                    onValueChange={(value) =>
                                        handlePreferenceChange(key, value)
                                    }
                                >
                                    <SelectTrigger
                                        id={`constraint-pref-${key}`}
                                        className="w-full shrink-0 bg-background sm:w-[min(100%,12rem)]"
                                    >
                                        <SelectValue placeholder="Not set" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value={CONSTRAINT_PREFERENCE_UNSET_VALUE}
                                        >
                                            Not set
                                        </SelectItem>
                                        {orphan ? (
                                            <SelectItem value={orphan.value}>
                                                {orphan.label}
                                            </SelectItem>
                                        ) : null}
                                        {options.map((opt) => (
                                            <SelectItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        );
                    })}
                </div>
            </SettingsGroup>

            <SettingsGroup
                caption="Raw statements"
                description="View and delete only - statements come from coaching chat."
            >
                <RawStatementsList
                    items={draft.rawStatements}
                    onChange={(rawStatements) =>
                        updateDraft((current) => ({ ...current, rawStatements }))
                    }
                />
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
                    {saveMutation.isPending ? "Saving…" : "Save constraints"}
                </Button>
            </div>
        </form>
    );
}

/** Loads Constraint profile; empty-state card when none, else keyed editor. */
export function ConstraintProfileSection({
    user,
    onDirtyChange,
    onSaveSuccess,
}: IConstraintProfileSectionProps) {
    const { data, isLoading, isError } = useUserConstraints(user);

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
                Could not load Constraint Profile. Try again later.
            </p>
        );
    }

    if (!hasEditableConstraints(data)) {
        return <ConstraintProfileEmptyState />;
    }

    return (
        <ConstraintProfileEditor
            key={user.id}
            userId={user.id}
            initialRecord={data}
            onDirtyChange={onDirtyChange}
            onSaveSuccess={onSaveSuccess}
        />
    );
}

"use client";

/**
 * @module account/ConstraintProfileSection
 *
 * Self-contained Constraint profile editor. Local draft + dedicated Save constraints;
 * reports dirty via onDirtyChange for page leave warn.
 *
 * Depends on: useUserConstraints, saveUserConstraintProfile, draft/options helpers, UI
 * Used by: EditProfileContent
 */

import {
    useState,
    type FormEvent,
    type KeyboardEvent,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
    emptyUserConstraintProfileRecord,
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
import { cn } from "@/lib/utils";

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

export interface IConstraintProfileSectionProps {
    user: User;
    /** Called whenever draft dirty state changes (for page leave warn). */
    onDirtyChange?: (isDirty: boolean) => void;
    onSaveSuccess?: () => void;
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
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
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
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className="flex-1"
                />
                <Button type="button" variant="outline" onClick={commit}>
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
            <p className="text-sm text-muted-foreground">No raw statements yet.</p>
        );
    }

    return (
        <ul className="space-y-2">
            {items.map((item, index) => (
                <li
                    key={`${item}-${index}`}
                    className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
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

    return (
        <form className="space-y-8" onSubmit={handleSave} noValidate>
            <FreeformChipList
                id="constraint-injuries"
                label="Injuries"
                items={draft.injuries}
                placeholder="Add an injury or movement restriction"
                onChange={(injuries) => updateDraft((current) => ({ ...current, injuries }))}
            />

            <div className="space-y-2">
                <Label htmlFor="constraint-excluded-equipment">Excluded equipment</Label>
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

            <div className="space-y-2">
                <Label htmlFor="constraint-excluded-areas">Excluded areas</Label>
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

            <fieldset className="space-y-4">
                <legend className="text-sm font-medium">Preferences</legend>
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
                        <div key={key} className="space-y-2">
                            <Label htmlFor={`constraint-pref-${key}`}>{label}</Label>
                            <Select
                                value={selectValue}
                                onValueChange={(value) =>
                                    handlePreferenceChange(key, value)
                                }
                            >
                                <SelectTrigger id={`constraint-pref-${key}`}>
                                    <SelectValue placeholder="Not set" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={CONSTRAINT_PREFERENCE_UNSET_VALUE}>
                                        Not set
                                    </SelectItem>
                                    {orphan ? (
                                        <SelectItem value={orphan.value}>
                                            {orphan.label}
                                        </SelectItem>
                                    ) : null}
                                    {options.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    );
                })}
            </fieldset>

            <FreeformChipList
                id="constraint-chat-refinements"
                label="Chat refinements"
                items={draft.chatRefinements}
                placeholder="Add a chat refinement"
                onChange={(chatRefinements) =>
                    updateDraft((current) => ({ ...current, chatRefinements }))
                }
            />

            <div className="space-y-2">
                <Label>Raw statements</Label>
                <p className="text-xs text-muted-foreground">
                    View and delete only — statements come from coaching chat.
                </p>
                <RawStatementsList
                    items={draft.rawStatements}
                    onChange={(rawStatements) =>
                        updateDraft((current) => ({ ...current, rawStatements }))
                    }
                />
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={!isDirty || saveMutation.isPending}
                    className={cn(!isDirty && "opacity-60")}
                >
                    {saveMutation.isPending ? "Saving…" : "Save constraints"}
                </Button>
            </div>
        </form>
    );
}

/** Loads Constraint profile, then mounts keyed editor (reset via remount). */
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
                Could not load Constraint profile. Try again later.
            </p>
        );
    }

    const initialRecord = data ?? emptyUserConstraintProfileRecord();

    return (
        <ConstraintProfileEditor
            key={user.id}
            userId={user.id}
            initialRecord={initialRecord}
            onDirtyChange={onDirtyChange}
            onSaveSuccess={onSaveSuccess}
        />
    );
}

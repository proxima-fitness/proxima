"use client";

/**
 * @module HevyCreateCustomExerciseView
 * Form to create a Hevy custom exercise template (POST /v1/exercise_templates).
 * Depends on: Input, Select, MultiSelect, postHevyCustomExercise, TanStack Query.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { postHevyCustomExercise } from "@/components/program-builder/api/hevy";
import { getHevyMuscleGroupSelectOptions } from "@/components/program-builder/hevy/hevy-muscle-group-labels";
import { Input } from "@/components/ui/input";
import MultiSelect from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EXERCISE_TYPE_OPTIONS: { value: THevyPostExerciseTemplate["exercise_type"]; label: string }[] = [
    { value: "weight_reps", label: "Weight + Reps" },
    { value: "reps_only", label: "Reps only" },
    { value: "bodyweight_reps", label: "Bodyweight reps" },
    { value: "bodyweight_assisted_reps", label: "Bodyweight assisted reps" },
    { value: "duration", label: "Duration" },
    { value: "weight_duration", label: "Weight + duration" },
    { value: "distance_duration", label: "Distance + duration" },
    { value: "short_distance_weight", label: "Short distance + weight" },
];

const EQUIPMENT_OPTIONS: { value: THevyPostExerciseTemplate["equipment_category"]; label: string }[] = [
    { value: "none", label: "None" },
    { value: "barbell", label: "Barbell" },
    { value: "dumbbell", label: "Dumbbell" },
    { value: "kettlebell", label: "Kettlebell" },
    { value: "machine", label: "Machine" },
    { value: "plate", label: "Plate" },
    { value: "resistance_band", label: "Resistance band" },
    { value: "suspension", label: "Suspension" },
    { value: "other", label: "Other" },
];

const MUSCLE_GROUP_OPTIONS = getHevyMuscleGroupSelectOptions();

const MUSCLE_MULTI_OPTIONS: TSelectOption[] = MUSCLE_GROUP_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
}));

/** DOM id for `<form>`; footer submit buttons use `form={HEVY_CREATE_CUSTOM_EXERCISE_FORM_ID}`. */
export const HEVY_CREATE_CUSTOM_EXERCISE_FORM_ID = "hevy-create-custom-exercise";

interface IProps {
    hevyApiKey: string | undefined;
    onSuccess: () => void;
    /** Notifies parent when async submit starts/finishes (e.g. footer Create disabled state). */
    onSubmittingChange?: (submitting: boolean) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <div className="text-sm font-medium text-foreground mb-1.5">{children}</div>;
}

export const HevyCreateCustomExerciseView: React.FC<IProps> = ({ hevyApiKey, onSuccess, onSubmittingChange }) => {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState("");
    const [exerciseType, setExerciseType] = useState<THevyPostExerciseTemplate["exercise_type"] | "">("");
    const [equipment, setEquipment] = useState<THevyPostExerciseTemplate["equipment_category"] | "">("");
    const [primaryMuscle, setPrimaryMuscle] = useState<THevyPostExerciseTemplate["muscle_group"] | "">("");
    const [otherMuscles, setOtherMuscles] = useState<TSelectOption[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmed = title.trim();
        if (!trimmed) {
            toast.error("Please enter an exercise name");
            return;
        }
        if (!exerciseType || !equipment || !primaryMuscle) {
            toast.error("Please fill in exercise type, equipment, and primary muscle group");
            return;
        }
        if (!hevyApiKey) {
            toast.error("Hevy API key is required to create a custom exercise");
            return;
        }

        const otherValues = otherMuscles
            .map((o) => o.value as THevyPostExerciseTemplate["muscle_group"])
            .filter((m) => m !== primaryMuscle);

        const exercise: THevyPostExerciseTemplate = {
            title: trimmed,
            exercise_type: exerciseType,
            equipment_category: equipment,
            muscle_group: primaryMuscle,
            other_muscles: otherValues,
        };

        setIsSubmitting(true);
        onSubmittingChange?.(true);
        try {
            await postHevyCustomExercise(exercise, hevyApiKey);
            await queryClient.invalidateQueries({ queryKey: ["hevy-custom-exercises"] });
            toast.success("Custom exercise created");
            onSuccess();
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : undefined;
            toast.error(message ?? "Could not create custom exercise. Try again.");
        } finally {
            setIsSubmitting(false);
            onSubmittingChange?.(false);
        }
    };

    return (
        <form
            id={ HEVY_CREATE_CUSTOM_EXERCISE_FORM_ID }
            className="mx-auto w-full max-w-md px-4 sm:px-6 py-2 flex flex-col gap-4"
            onSubmit={ (e) => {
                e.preventDefault();
                void handleSubmit();
            } }
        >
            <div>
                <FieldLabel>Exercise Name</FieldLabel>
                <Input
                    placeholder="Enter exercise name..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoComplete="off"
                    aria-label="Exercise name"
                />
            </div>
            <div>
                <FieldLabel>Exercise Type</FieldLabel>
                <Select
                    value={exerciseType || undefined}
                    onValueChange={(v) => setExerciseType(v as THevyPostExerciseTemplate["exercise_type"])}
                >
                    <SelectTrigger className="h-10" aria-label="Exercise type">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {EXERCISE_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <FieldLabel>Equipment</FieldLabel>
                <Select
                    value={equipment || undefined}
                    onValueChange={(v) => setEquipment(v as THevyPostExerciseTemplate["equipment_category"])}
                >
                    <SelectTrigger className="h-10" aria-label="Equipment">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {EQUIPMENT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <FieldLabel>Primary Muscle Group</FieldLabel>
                <Select
                    value={primaryMuscle || undefined}
                    onValueChange={(v) => {
                        const next = v as THevyPostExerciseTemplate["muscle_group"];
                        setPrimaryMuscle(next);
                        setOtherMuscles((prev) => prev.filter((o) => o.value !== next));
                    }}
                >
                    <SelectTrigger className="h-10" aria-label="Primary muscle group">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {MUSCLE_GROUP_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <FieldLabel>Other Muscles</FieldLabel>
                <MultiSelect
                    options={MUSCLE_MULTI_OPTIONS.filter((o) => o.value !== primaryMuscle)}
                    value={otherMuscles}
                    onChange={setOtherMuscles}
                    placeholder="Select..."
                    emptyIndicator={<span className="text-sm text-muted-foreground">No muscles found</span>}
                    disabled={ isSubmitting }
                />
            </div>
        </form>
    );
};

"use client";

/**
 * @module HevyAddExerciseDialog
 * Modal/drawer for adding or editing an exercise in a Hevy program day. Provides exercise search,
 * sets/reps/intensity/set-type inputs, rest time, and add/edit/cancel actions. Responsive: drawer on mobile, dialog on desktop.
 * Depends on: HevyExerciseSearchBar, UI (Drawer/Dialog/Select/Input/Button), hevy constants, API hooks.
 * Used by: HevyRoutine (when add exercise or edit exercise is triggered).
 */

import { useHevyCustomExercises, useHevyExercises, useHevySecret } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { hevy_rep_types } from "@/assets/constants";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { formatWeight, getWeightUnit, parseWeight } from "@/lib/weightUtils";
import { toast } from "sonner";
import { ChevronLeft, PlusIcon, Trash2Icon, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HevyCreateCustomExerciseView, HEVY_CREATE_CUSTOM_EXERCISE_FORM_ID } from "./HevyCreateCustomExerciseView";
import { HevyExerciseSearchBar } from "./HevyExerciseSearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserContext } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useProgramMutation } from "@/contexts/ProgramMutationContext";

/** Props for the add/edit exercise dialog. */
interface IProps {
    /** Current dialog state: open/closed, target folder and day, and optional exercise data when editing. */
    addExerciseDialog: THevyDialog;
    /** When true, dialog is in edit mode and pre-fills from editExercise. */
    isEditExercise: boolean;
    /** Called to append a new exercise to the given week/day. */
    handleAddExercise: (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => void;
    /** Called to apply edits to an existing exercise (uses exerciseIndex from dialog). */
    handleEditExercise: (editExercise: THevyDialog) => void;
    /** Called to open/close the dialog (e.g. set isOpen and clear target). */
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
}

/**
 * Add or edit exercise dialog: exercise search, sets/reps/intensity/set types, rest, save/cancel.
 * Renders as Drawer on mobile and Dialog on desktop.
 */
export const HevyAddExerciseDialog: React.FC<IProps> = (props) => {

    const {
        addExerciseDialog,
        isEditExercise,
        handleAddExercise,
        handleEditExercise,
        handleOpenAddExerciseDialog,
    } = props;

    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);

    const isMobile = useIsMobile();
    const { isInLbs } = usePoundsOrKgContext();
    const { isAgentStreaming } = useProgramMutation();
    const mutationsLocked = isAgentStreaming;
    const weightUnit = getWeightUnit(isInLbs);

    const emptyPerSetArray = (length: number) => Array.from({ length }, () => null as number | null);

    const { data: exercises, isLoading: loadingHevyExercises } = useHevyExercises();
    const { data: customExercises, isLoading: loadingCustomExercises } = useHevyCustomExercises(user, hevyApiKey);

    // Hevy API customs first, then Supabase mirror (full library). Overlapping titles may appear twice.
    const combinedExercises = useMemo(() => {
        if (!exercises && !customExercises) return undefined;

        const custom = customExercises || [];
        const regular = exercises || [];

        return [...custom, ...regular];
    }, [exercises, customExercises]);

    const isLoading = loadingHevyExercises || loadingCustomExercises;

    const [ showCreateCustomExercise, setShowCreateCustomExercise ] = useState(false);
    const [ customExerciseSubmitting, setCustomExerciseSubmitting ] = useState(false);

    const exitCustomExerciseView = () => {
        setShowCreateCustomExercise(false);
        setCustomExerciseSubmitting(false);
    };

    const closeAddExerciseDialog = () => {
        setShowCreateCustomExercise(false);
        setCustomExerciseSubmitting(false);
        handleOpenAddExerciseDialog({ folder_id: 0, dayOrder: 0, isOpen: false });
    };

    const [ selectedExercise, setSelectedExercise ] = useState<THevyExerciseTemplate>();
    const [ isEditing, setIsEditing ] = useState(true);

    const handleIsEditing = (isEditing: boolean) => {
        setIsEditing(isEditing);
    };

    const handleSelectedExercise = async (item: THevyExerciseTemplate) => {
        setSelectedExercise(item);
        setIsEditing(false);
    };

    const [ restSeconds, setRestSeconds ] = useState(isEditExercise ? addExerciseDialog.editExercise?.restSeconds ?? "0" : "0");

    const defaultSetCount = 4;
    const [ reps, setReps ] = useState<number[] | undefined>(isEditExercise ? undefined : [8,8,8,8]);
    const [ repRangeStart, setRepRangeStart ] = useState<number[] | undefined>(undefined);
    const [ repRangeEnd, setRepRangeEnd ] = useState<number[] | undefined>(undefined);
    const [ setTypes, setSetTypes ] = useState<("normal" | "warmup" | "dropset" | "failure")[]>(isEditExercise ? addExerciseDialog.editExercise?.setTypes ?? ["normal","normal","normal","normal"] : ["normal","normal","normal","normal"]);
    const [ weightKg, setWeightKg ] = useState<(number | null)[]>(emptyPerSetArray(defaultSetCount));
    const [ weightInputs, setWeightInputs ] = useState<string[]>(Array(defaultSetCount).fill(""));
    const [ rpe, setRpe ] = useState<(number | null)[]>(emptyPerSetArray(defaultSetCount));
    const [ rpeInputs, setRpeInputs ] = useState<string[]>(Array(defaultSetCount).fill(""));

    const [ repTypeValue, setRepTypeValue ] = useState(isEditExercise ? undefined : hevy_rep_types[0].value);

    const handleSetType = (value: "normal" | "warmup" | "dropset" | "failure", index: number) => {
        const updatedSetTypes = [...setTypes];
        updatedSetTypes[index] = value;
        setSetTypes(updatedSetTypes);
    };

    const normalizePerSetField = (values: (number | null)[]): (number | null)[] | null => {
        const normalized = values.map((value) => (value == null || value <= 0 ? null : value));
        return normalized.every((value) => value === null) ? null : normalized;
    };

    const handleWeightInput = (value: string, index: number) => {
        setWeightInputs((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleWeightBlur = (value: string, index: number) => {
        const parsedKg = parseWeight(value, isInLbs);
        setWeightKg((prev) => {
            const next = [...prev];
            next[index] = parsedKg;
            return next;
        });
        setWeightInputs((prev) => {
            const next = [...prev];
            next[index] = parsedKg != null ? formatWeight(parsedKg, isInLbs, "kg") : "";
            return next;
        });
    };

    const handleRpeInput = (value: string, index: number) => {
        setRpeInputs((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleRpeBlur = (value: string, index: number) => {
        if (value.trim() === "") {
            setRpe((prev) => {
                const next = [...prev];
                next[index] = null;
                return next;
            });
            setRpeInputs((prev) => {
                const next = [...prev];
                next[index] = "";
                return next;
            });
            return;
        }
        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed < 1 || parsed > 10) {
            toast.error("RPE must be between 1 and 10");
            setRpeInputs((prev) => {
                const next = [...prev];
                next[index] = rpe[index] != null ? String(rpe[index]) : "";
                return next;
            });
            return;
        }
        setRpe((prev) => {
            const next = [...prev];
            next[index] = parsed;
            return next;
        });
        setRpeInputs((prev) => {
            const next = [...prev];
            next[index] = String(parsed);
            return next;
        });
    };

    const handleSaveReps = (value: string | number , index: number) => {
        let updatedReps: number[] = [];
        if (reps) {
            updatedReps = [...reps];
        }
        updatedReps[index] = Number(value);
        setReps(updatedReps);
	};

    const handleSaveRepRangeStart = (value: string | number, index: number) => {
        setRepRangeStart((prev) => {
            const next = [...(prev ?? Array(setTypes.length).fill(8))];
            next[index] = Number(value);
            return next;
        });
    };

    const handleSaveRepRangeEnd = (value: string | number, index: number) => {
        setRepRangeEnd((prev) => {
            const next = [...(prev ?? Array(setTypes.length).fill(12))];
            next[index] = Number(value);
            return next;
        });
    };


    const handleSave = async () => {
        if (mutationsLocked) return;
        if (!selectedExercise || selectedExercise.title === "") {
            toast.error("Please select an exercise");
            return;
        }

        const isRepRange = repTypeValue === "reps_range";
        const exerciseData: THevyAddExercise = {
            selectedExercise,
            repTypeValue: (repTypeValue ?? "reps") as THevyAddExercise["repTypeValue"],
            reps: isRepRange ? null : reps ?? null,
            repRangeStart: isRepRange ? (repRangeStart ?? Array(setTypes.length).fill(8)) : null,
            repRangeEnd: isRepRange ? (repRangeEnd ?? Array(setTypes.length).fill(12)) : null,
            weightKg: normalizePerSetField(weightKg),
            rpe: normalizePerSetField(rpe),
            setTypes,
            restSeconds,
        };
        const newExercise = exerciseData;

        if (isEditExercise) {
            handleEditExercise({isOpen: false, folder_id: addExerciseDialog.folder_id, dayOrder: addExerciseDialog.dayOrder, exerciseIndex: addExerciseDialog.exerciseIndex ,editExercise: newExercise});
        } else {
            handleAddExercise(addExerciseDialog.folder_id, addExerciseDialog.dayOrder, newExercise);
        }

        closeAddExerciseDialog();
    };

    const deleteSet = (index: number) => {
        setSetTypes((prev) => prev.filter((_, i) => i !== index));
        setReps((prev) => prev?.filter((_, i) => i !== index));
        setRepRangeStart((prev) => prev?.filter((_, i) => i !== index));
        setRepRangeEnd((prev) => prev?.filter((_, i) => i !== index));
        setWeightKg((prev) => prev.filter((_, i) => i !== index));
        setWeightInputs((prev) => prev.filter((_, i) => i !== index));
        setRpe((prev) => prev.filter((_, i) => i !== index));
        setRpeInputs((prev) => prev.filter((_, i) => i !== index));
    };

    const addSet = () => {
        if (setTypes.length >= 10) {
            return;
        }
        setSetTypes((prev) => [...prev, "normal"]);
        setWeightKg((prev) => [...prev, null]);
        setWeightInputs((prev) => [...prev, ""]);
        setRpe((prev) => [...prev, null]);
        setRpeInputs((prev) => [...prev, ""]);
        if ((repTypeValue ?? "reps") === "reps_range") {
            setRepRangeStart((prev) => [...(prev ?? Array(setTypes.length).fill(8)), 8]);
            setRepRangeEnd((prev) => [...(prev ?? Array(setTypes.length).fill(12)), 12]);
        } else {
            setReps((prev) => [...(prev ?? [8, 8, 8, 8]), 8]);
        }
    };

    const handleSwapRepTypeValue = (value: string) => {
        setRepTypeValue(value);
        const n = setTypes.length;
        if (value === "reps_range") {
            setRepRangeStart(Array.from({ length: n }, () => 8));
            setRepRangeEnd(Array.from({ length: n }, () => 12));
            setReps(undefined);
        } else {
            setReps(Array.from({ length: n }, () => 8));
            setRepRangeStart(undefined);
            setRepRangeEnd(undefined);
        }
    };

    useEffect(() => {
        const getExercise = async () => {
            const editExercise = addExerciseDialog?.editExercise;
            const exercise = editExercise?.selectedExercise;
            const rt = editExercise?.repTypeValue ?? hevy_rep_types[0].value;
            const setCount = editExercise?.setTypes?.length ?? defaultSetCount;
            const hydratedWeightKg = editExercise?.weightKg ?? emptyPerSetArray(setCount);
            const hydratedRpe = editExercise?.rpe ?? emptyPerSetArray(setCount);

            setRepTypeValue(rt);
            setSetTypes(editExercise?.setTypes ?? ["normal","normal","normal","normal"]);
            setRestSeconds(editExercise?.restSeconds ?? "0");
            setWeightKg(hydratedWeightKg);
            setWeightInputs(hydratedWeightKg.map((value) => value != null ? formatWeight(value, isInLbs, "kg") : ""));
            setRpe(hydratedRpe);
            setRpeInputs(hydratedRpe.map((value) => value != null ? String(value) : ""));

            if (rt === "reps_range") {
                setReps(undefined);
                setRepRangeStart(editExercise?.repRangeStart ?? [8,8,8,8]);
                setRepRangeEnd(editExercise?.repRangeEnd ?? [12,12,12,12]);
            } else {
                setReps(editExercise?.reps ?? [8,8,8,8]);
                setRepRangeStart(undefined);
                setRepRangeEnd(undefined);
            }

            if (exercise) {
                setSelectedExercise(exercise);
            }
        };
        if (isEditExercise) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsEditing(false);
            getExercise();
        }
    }, [isEditExercise, isInLbs, addExerciseDialog?.editExercise?.weightKg, addExerciseDialog?.editExercise?.rpe, addExerciseDialog?.editExercise?.repTypeValue, addExerciseDialog?.editExercise?.repRangeStart, addExerciseDialog?.editExercise?.repRangeEnd, addExerciseDialog?.editExercise?.reps, addExerciseDialog?.editExercise?.restSeconds, addExerciseDialog?.editExercise?.setTypes, addExerciseDialog?.editExercise?.selectedExercise?.id, addExerciseDialog?.editExercise?.selectedExercise, addExerciseDialog?.editExercise]);

    const dialogTitle = showCreateCustomExercise
        ? "Create Custom Exercise"
        : `Add Exercise to Week ${addExerciseDialog.folder_id + 1} Day ${addExerciseDialog.dayOrder}`;

    const dialogContent = showCreateCustomExercise ? (
        <HevyCreateCustomExerciseView
            hevyApiKey={ hevyApiKey }
            onSubmittingChange={ setCustomExerciseSubmitting }
            onSuccess={ () => {
                setShowCreateCustomExercise(false);
                setIsEditing(true);
            } }
        />
    ) : (
        <>
            <div className="overflow-y-auto mx-auto w-full max-w-3xl px-4 sm:px-6">
                { isLoading ?
                    <div style={ { display: "flex",width: "100%", height: "358px", textAlign: "center", justifyContent: "center", alignItems: "center"} }>
                        <Skeleton className="w-full h-full"></Skeleton>
                    </div>
                    : combinedExercises !== undefined &&
                    <HevyExerciseSearchBar
                        title={ "Exercise" }
                        items={ combinedExercises }
                        handleSelectedExercise= { handleSelectedExercise }
                        selectedExercise={ selectedExercise }
                        isEditing={ isEditing }
                        handleIsEditing={ handleIsEditing }
                        onCreateCustomExercise={ () => setShowCreateCustomExercise(true) }
                    />
                }
                <div className="mt-4">
                    <div className="flex flex-row justify-center gap-2 items-center w-full pl-3 pb-4">
                        <div className="flex items-start justify-start w-[8%]">
                            Set
                        </div>
                        <div className="w-[22%]">
                            <Select value={ repTypeValue ?? "reps" } aria-label="rep type" onValueChange={ (value) => handleSwapRepTypeValue(value) }>
                                <SelectTrigger  className="h-10">
                                    <SelectValue placeholder="Reps" />
                                </SelectTrigger>
                                <SelectContent>
                                    { hevy_rep_types.map((rep_type) => (
                                        <SelectItem key={ rep_type.value } value={ rep_type.value }>{ rep_type.label }</SelectItem>
                                        ) ) }
                                </SelectContent>

                            </Select>
                        </div>
                        <div className="w-[22%]">
                            <div className="text-sm text-muted-foreground text-center">{isInLbs ? "Lbs" : "Kg"}</div>
                        </div>
                        <div className="w-[22%]">
                            <div className="text-sm text-muted-foreground text-center">RPE</div>
                        </div>
                        <div className="w-[20%]">
                            <div className="text-sm text-muted-foreground text-center">Set Type</div>
                        </div>
                        <div className="w-[8%]">
                        </div>
                    </div>

                    { setTypes.length > 0 && setTypes.map((_, index: number) => (
                        <div
                            key={ "Set" + index }
                            className={ `flex flex-row justify-center gap-2 items-center w-full py-1 pl-3 ${ setTypes[index] === "warmup" ? "bg-gray-300 dark:text-black" : setTypes[index] === "dropset" ? "bg-[#33bbcf]" : setTypes[index] === "failure" ? "bg-[#01579B]" : "" }` }>
                            <div className="flex items-center justify-start w-[8%]">
                                { index + 1 }
                            </div>
                            <div className="w-[22%]">
                                { repTypeValue === "reps_range" ? (
                                    <div className="flex flex-row gap-2 w-full">
                                        <Input
                                            type="number"
                                            placeholder="Start"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            className="text-base sm:text-sm flex-1 min-w-0"
                                            style={{ fontSize: isMobile ? '16px' : undefined }}
                                            value={ repRangeStart?.[index] ?? "" }
                                            onInput={ (event) => handleSaveRepRangeStart(event.currentTarget.value ?? "0", index) }
                                            onBlur={ (event) => handleSaveRepRangeStart(event.target.value ?? "0", index) }
                                            onKeyDown={ (e) => {
                                                if (e.key === "Enter") {
                                                    handleSaveRepRangeStart((e.target as HTMLInputElement).value, index);
                                                }
                                            } }
                                        />
                                        <Input
                                            type="number"
                                            placeholder="End"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            className="text-base sm:text-sm flex-1 min-w-0"
                                            style={{ fontSize: isMobile ? '16px' : undefined }}
                                            value={ repRangeEnd?.[index] ?? "" }
                                            onInput={ (event) => handleSaveRepRangeEnd(event.currentTarget.value ?? "0", index) }
                                            onBlur={ (event) => handleSaveRepRangeEnd(event.target.value ?? "0", index) }
                                            onKeyDown={ (e) => {
                                                if (e.key === "Enter") {
                                                    handleSaveRepRangeEnd((e.target as HTMLInputElement).value, index);
                                                }
                                            } }
                                        />
                                    </div>
                                ) : (
                                <Input
                                    type="number"
                                    placeholder={ (repTypeValue === "duration_seconds") ? "Secs" : repTypeValue === "distance_meters" ? "Meters" : "Reps" }
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="text-base sm:text-sm"
                                    style={{ fontSize: isMobile ? '16px' : undefined }}
                                    value={ reps?.[index] ?? "" }
                                    onInput={ (event) => handleSaveReps(event.currentTarget.value ?? "0", index) }
                                    onBlur={ (event) => handleSaveReps(event.target.value ?? "0", index) }
                                    onKeyDown={ (e) => {
                                        if (e.key === 'Enter') {
                                            handleSaveReps((e.target as HTMLInputElement).value,index);
                                    }
                                    } }
                                />
                                ) }
                            </div>
                            <div className="w-[22%]">
                                <Input
                                    type="number"
                                    placeholder={ weightUnit }
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="text-base sm:text-sm"
                                    style={{ fontSize: isMobile ? '16px' : undefined }}
                                    value={ weightInputs[index] ?? "" }
                                    onInput={ (e) => handleWeightInput(e.currentTarget.value, index) }
                                    onBlur={ (e) => handleWeightBlur(e.target.value, index) }
                                    onKeyDown={ (e) => {
                                        if (e.key === 'Enter') {
                                            handleWeightBlur((e.target as HTMLInputElement).value, index);
                                    }
                                    } }
                                />
                            </div>
                            <div className="w-[22%]">
                                <Input
                                    type="number"
                                    placeholder="RPE"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="text-base sm:text-sm"
                                    style={{ fontSize: isMobile ? '16px' : undefined }}
                                    value={ rpeInputs[index] ?? "" }
                                    onInput={ (e) => handleRpeInput(e.currentTarget.value, index) }
                                    onBlur={ (e) => handleRpeBlur(e.target.value, index) }
                                    onKeyDown={ (e) => {
                                        if (e.key === 'Enter') {
                                            handleRpeBlur((e.target as HTMLInputElement).value, index);
                                    }
                                    } }
                                />
                            </div>
                            <div className="w-[20%]">
                                <Select
                                    value={ setTypes[index] }
                                    onValueChange={ (value: "normal" | "warmup" | "dropset" | "failure") => handleSetType(value, index) }
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue>
                                            { setTypes[index] === "normal" ? "Normal" :
                                              setTypes[index] === "warmup" ? "Warmup" :
                                              setTypes[index] === "dropset" ? "Drop Set" :
                                              "Failure" }
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="warmup">Warmup</SelectItem>
                                        <SelectItem value="dropset">Drop Set</SelectItem>
                                        <SelectItem value="failure">Failure</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-[8%] flex justify-center">
                                <Trash2Icon className="cursor-pointer" onClick={ () => deleteSet(index) } />
                            </div>
                        </div>
                    ) )

                }
                <div className="pt-4 px-4 sm:px-20 flex flex-col gap-4">
                    <div className="flex flex-row justify-center gap-2 items-center w-full">
                        <div className="w-[8%]"></div>
                        <div className="flex-1 flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Rest Time (secs)"
                                value={ restSeconds }
                                onChange={ (e) => setRestSeconds(e.target.value) }
                                inputMode="numeric"
                                autoComplete="off"
                                className="text-base sm:text-sm"
                                style={{ fontSize: isMobile ? '16px' : undefined }}
                            />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Rest Time (s)</span>
                        </div>
                    </div>

                    <Button
                        onClick={ () => addSet() }
                        variant="ghost"
                        className="h-10 w-full rounded-full font-bold uppercase hover:bg-gray-200 dark:hover:bg-darkGray"
                    >
                        <PlusIcon /> Add Set
                    </Button>
                </div>
                </div>
            </div>
        </>
    );

    const addExerciseFooterButtons = (
        <>
            <span className="flex w-full items-center justify-center">
                <Button
                    onClick={ closeAddExerciseDialog }
                    variant="outline"
                    className="h-11 w-full rounded-full border-border/80 sm:h-12"
                    aria-label="Cancel and close"
                >
                    Cancel
                </Button>
            </span>
            <span className="flex w-full items-center justify-center">
                <Button
                    onClick={ () => handleSave() }
                    disabled={mutationsLocked}
                    className="h-11 w-full rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isEditExercise ? "Edit" : "Add"}
                </Button>
            </span>
        </>
    );

    const customExerciseFooterButtons = (
        <>
            <span className="flex w-full items-center justify-center">
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-full border-border/80 sm:h-12"
                    onClick={ exitCustomExerciseView }
                    aria-label="Cancel and go back to exercise search"
                >
                    Cancel
                </Button>
            </span>
            <span className="flex w-full items-center justify-center">
                <Button
                    type="submit"
                    form={ HEVY_CREATE_CUSTOM_EXERCISE_FORM_ID }
                    className="h-11 w-full rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90 disabled:opacity-60 sm:h-12"
                    disabled={ customExerciseSubmitting }
                >
                    Create
                </Button>
            </span>
        </>
    );

    if (isMobile) {
        return (
            <Drawer
                open={ addExerciseDialog.isOpen }
                modal={ addExerciseDialog.isOpen }
                onOpenChange={ (open) => { if (!open) closeAddExerciseDialog(); } }
            >
                <DrawerContent
                    className={ cn(
                        showCreateCustomExercise
                            ? "mt-0 h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden"
                            : "max-h-[98%]",
                    ) }
                >
                    <div
                        className={ cn(
                            "overflow-y-auto",
                            showCreateCustomExercise && "min-h-0 flex-1",
                        ) }
                    >
                        { showCreateCustomExercise ? (
                            <div className="flex flex-row items-center gap-2 px-4 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="-ml-1 h-9 w-9 shrink-0 rounded-full"
                                    onClick={ exitCustomExerciseView }
                                    aria-label="Back"
                                >
                                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                                </Button>
                                <DrawerTitle className="font-bold flex-1 text-center">
                                    {dialogTitle}
                                </DrawerTitle>
                            </div>
                        ) : (
                            <DrawerTitle className="font-bold flex items-center justify-center px-4 pt-4">
                                {dialogTitle}
                            </DrawerTitle>
                        ) }
                        {dialogContent}
                    </div>
                    <DrawerFooter className="flex flex-row items-center justify-between gap-2 border-t border-border/40 px-4 pt-4">
                        { showCreateCustomExercise ? customExerciseFooterButtons : addExerciseFooterButtons }
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog
            open={ addExerciseDialog.isOpen }
            onOpenChange={ (open) => { if (!open) closeAddExerciseDialog(); } }
        >
            <DialogContent
                className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onOpenAutoFocus={ (e) => e.preventDefault() }
                hideClose={ showCreateCustomExercise }
            >
                <DialogHeader
                    className={
                        showCreateCustomExercise
                            ? "grid grid-cols-[auto_1fr_auto] items-center gap-2 space-y-0 w-full"
                            : undefined
                    }
                >
                    { showCreateCustomExercise ? (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                className="-ml-2 h-9 shrink-0 gap-1.5 rounded-full px-3"
                                onClick={ exitCustomExerciseView }
                            >
                                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                                Back
                            </Button>
                            <DialogTitle className="font-bold text-center">
                                {dialogTitle}
                            </DialogTitle>
                            <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </DialogClose>
                        </>
                    ) : (
                        <DialogTitle className="font-bold text-center">
                            {dialogTitle}
                        </DialogTitle>
                    ) }
                </DialogHeader>
                <div className="overflow-y-auto flex-1">
                    {dialogContent}
                </div>
                <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-border/40 pt-4">
                    { showCreateCustomExercise ? customExerciseFooterButtons : addExerciseFooterButtons }
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

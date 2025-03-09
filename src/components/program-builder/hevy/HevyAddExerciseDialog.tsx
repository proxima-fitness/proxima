"use client";

import { useExercises, useHevyExercises } from "@/api/hooks";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { intensities, rep_types } from "@/assets/constants";
import { addExerciseToHevySetsConverter, getExerciseFromLocalStorageByID, getExerciseGifIdForHevyExercise, getHevyExerciseFromLocalStorageByName } from "@/utils/helpers";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HevyExerciseSearchBar } from "./HevyExerciseSearchBar";

interface IProps {
    addExerciseDialog: THevyDialog;
    isEditExercise: boolean;
    handleAddExercise: (folder_id: number, dayOrder: number, exercise: TAddExercise) => void;
    // handleEditExercise: (editExercise: THevyDialog) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
}

export const HevyAddExerciseDialog: React.FC<IProps> = (props) => {

    const {
        addExerciseDialog,
        isEditExercise,
        handleAddExercise,
        // handleEditExercise,
        handleOpenAddExerciseDialog,
    } = props;

    const { data: exercises, isLoading: loadingExercises } = useHevyExercises();

    const [ exerciseID, setExerciseID ] = useState<string>();
    const [ selectedName, setSelectedName ] = useState<string>("");
    const [ selectedGifID, setSelectedGifID ] = useState<string>();
    const [ isEditing, setIsEditing ] = useState(true);

    const handleIsEditing = (isEditing: boolean) => {
        setIsEditing(isEditing);
    };

    const handleSelected = async (item: THevyExerciseTemplate) => {
        const fetchedExerciseItem = await getHevyExerciseFromLocalStorageByName(item.title);
        if (fetchedExerciseItem) {
            setExerciseID(fetchedExerciseItem.id);
            setSelectedName(fetchedExerciseItem.title);
            const gif_id = await getExerciseGifIdForHevyExercise(fetchedExerciseItem.title)
            setSelectedGifID(gif_id);
        }
        setIsEditing(false);
    };

    const [ editingSetWeight, setEditingSetWeight ] = useState([false,false,false,false]);

    // 3 SECTIONS: SETS, REPS, INTENSITY. reps and intensity are inputs.
    const [ reps, setReps ] = useState<number[]>(isEditExercise ? undefined : [8,8,8,8]);
    const [ intensityData, setIntensityData ] = useState<number[]>(isEditExercise ? undefined : [9,9,9,9]);

    // Data structure is different when rep/time/rpe ranges are used
    const [ repsWithTimeAndRepRange, setRepsWithTimeAndRepRange ] = useState<number[][]>(isEditExercise ? undefined : [[8,12],[8,12],[8,12],[8,12]]);
    const [ intensityDataWithRPERange, setIntensityDataWithRPERange ] = useState<number[][]>(isEditExercise ? undefined : [[9,10],[9,10],[9,10],[9,10]]);

    const [ repTypeValue, setRepTypeValue ] = useState(isEditExercise ? undefined : rep_types[0].value);
    const [ intensityValue, setIntensityValue ] = useState(isEditExercise ? undefined : intensities[0].value);

    const handleSaveIntensity = (value: string | number , index: number) => {
        const updatedWeights = [...intensityData];
        updatedWeights[index] = Number(value);
        setIntensityData(updatedWeights);

        const updatedEditingSetWeight = [...editingSetWeight];
        updatedEditingSetWeight[index] = !updatedEditingSetWeight[index];
        setEditingSetWeight(updatedEditingSetWeight);
	};

    const handleUpdatingIntensity = (value: string | number , index: number) => {
        const updatedIntensities = [...intensityData];
        updatedIntensities[index] = Number(value);
        setIntensityData(updatedIntensities);
    };

    const handleSaveReps = (value: string | number , index: number) => {
        const updatedReps = [...reps];
        updatedReps[index] = Number(value);
        setReps(updatedReps);
	};

    const handleSaveRepsRange = (value: string , index: number, startOrEnd: string) => {
        const valueWithNoDashes = value.replace(/[^0-9]/g, "");
        const innerIndex = startOrEnd === "start" ? 0 : 1;
        const updatedReps = [...repsWithTimeAndRepRange];
        updatedReps[index][innerIndex] = Number(valueWithNoDashes);
        setRepsWithTimeAndRepRange(updatedReps);
    } ;

    const handleSaveIntensityRange = (value: string | number , index: number, startOrEnd: string) => {
        const innerIndex = startOrEnd === "start" ? 0 : 1;
        const updatedIntensities = [...intensityDataWithRPERange];
        updatedIntensities[index][innerIndex] = Number(value);
        setIntensityDataWithRPERange(updatedIntensities);
    };

    const handleSave = async () => {
        if (selectedName === "") {
            toast.error("Please select an exercise");
            return;
        }

        const id = exerciseID;
        const exerciseData = { id, repTypeValue, intensityValue, reps, intensityData, repsWithTimeAndRepRange, intensityDataWithRPERange };
        const newExercise = (exerciseData as TAddExercise);

        if (isEditExercise) {
            // handleEditExercise({isOpen: false, folder_id: addExerciseDialog.folder_id, dayOrder: addExerciseDialog.dayOrder, exerciseIndex: addExerciseDialog.exerciseIndex ,editExercise: convertProgramCreatorExerciseToAddExercise(newExercise)});
        } else {
            handleAddExercise(addExerciseDialog.folder_id, addExerciseDialog.dayOrder, newExercise);
        }

        handleOpenAddExerciseDialog({ folder_id: undefined, dayOrder: undefined, isOpen: false});
    };

    const deleteSet = (index: number) => {
        setReps(reps.filter((_: number, i: number) => i !== index));
        setRepsWithTimeAndRepRange(repsWithTimeAndRepRange.filter((_,i) => i !== index));
        setIntensityData(intensityData.filter((_: number, i: number) => i !== index));
        setIntensityDataWithRPERange(intensityDataWithRPERange.filter((_,i) => i !== index));
    };

    const addSet = () => {
        if (repTypeValue === "time_range" || repTypeValue === "reps_range") {
            if (repsWithTimeAndRepRange.length < 10) setRepsWithTimeAndRepRange([...repsWithTimeAndRepRange, [8,12]]);
        } else {
            if (reps.length < 10) setReps([...reps, 8]);
        }
        if (intensityData.length < 10) setIntensityData([...intensityData, 9]);
        if (intensityDataWithRPERange.length < 10) setIntensityDataWithRPERange([...intensityDataWithRPERange, [9,10]]);
    };

    const handleSwapRepTypeValue = (value: string) => {
        setRepTypeValue(value);
        if (value === "time_range" || value === "reps_range") {
            setReps([]);
            setRepsWithTimeAndRepRange([[8,12],[8,12],[8,12],[8,12]]);
        } else {
            setRepsWithTimeAndRepRange([]);
            setReps([8,8,8,8]);
        }
    };

    useEffect(() => {
        const getExercise = async () => {
            const exercise = await getExerciseFromLocalStorageByID(addExerciseDialog?.editExercise?.id);
            setExerciseID(addExerciseDialog?.editExercise?.id);
            setRepsWithTimeAndRepRange(addExerciseDialog?.editExercise?.repsWithTimeAndRepRange ?? [[8,12],[8,12],[8,12],[8,12]]);
            setIntensityDataWithRPERange(addExerciseDialog?.editExercise?.intensityDataWithRPERange ?? [[9,10],[9,10],[9,10],[9,10]]);
            setRepTypeValue(addExerciseDialog?.editExercise?.repTypeValue ?? rep_types[0].value);
            setIntensityData(addExerciseDialog?.editExercise?.intensityData ?? [9,9,9,9]);
            setReps(addExerciseDialog?.editExercise?.reps ?? [8,8,8,8]);
            setIntensityValue(addExerciseDialog?.editExercise?.intensityValue ?? intensities[0].value);
            if (exercise) {
                setSelectedName(exercise[`name_english`]);
                setSelectedGifID(exercise?.gif_id);
            }
        };
        if (isEditExercise) {
            setIsEditing(false);
            getExercise();
        }
    }, [addExerciseDialog.editExercise?.id, addExerciseDialog.editExercise?.intensityData, addExerciseDialog.editExercise?.intensityDataWithRPERange, addExerciseDialog.editExercise?.intensityValue, addExerciseDialog.editExercise?.repTypeValue, addExerciseDialog.editExercise?.reps, addExerciseDialog.editExercise?.repsWithTimeAndRepRange]);

    return (
        <Dialog open={ addExerciseDialog.isOpen } onOpenChange={ () => handleOpenAddExerciseDialog({ folder_id: undefined, dayOrder: undefined, isOpen: false} )}>
            <DialogContent hideClose className="max-w-4xl w-full">
                <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                    Add Exercise to Week {addExerciseDialog.folder_id + 1} Day {addExerciseDialog.dayOrder}
                </DialogTitle>
                <div className={ "modal-content__centered" }>
                    <HevyExerciseSearchBar
                        title={ "Exercise" }
                        items={ exercises }
                        handleSelected= { handleSelected }
                        selectedName={ selectedName }
                        selectedGifID={ selectedGifID }
                        isEditing={ isEditing }
                        handleIsEditing={ handleIsEditing }
                    />
                    <div className="mt-4">

                            <div className="flex flex-row justify-center gap-2 items-center w-full pb-4">
                                <div className="flex items-start justify-start w-[10%]">
                                        Set
                                </div>
                                <div className="w-[33%]">
                                    <Select value={ repTypeValue } aria-label="rep type" onValueChange={ (value) => handleSwapRepTypeValue(value) }>
                                        <SelectTrigger autoFocus className="h-10">
                                            <SelectValue placeholder="Reps" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            { rep_types.map((rep_type) => (
                                                <SelectItem key={ rep_type.value } value={ rep_type.value }>{ rep_type.label }</SelectItem>
                                            ) ) }
                                        </SelectContent>

                                    </Select>
                                </div>
                                <div className="w-[33%]">
                                    <Select value={ intensityValue } aria-label="intensity" onValueChange={ (value) => setIntensityValue(value) }>
                                        <SelectTrigger autoFocus className="h-10">
                                            <SelectValue placeholder="Intensity" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            { intensities.map((intensity) => (
                                                <SelectItem key={ intensity.value } value={ intensity.value }>{ intensity.label }</SelectItem>
                                            ) ) }
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <XIcon className="opacity-0 pointer-events-none" />
                                </div>
                            </div>

                        { (reps && reps.length > 0) ? reps?.map((rep: string | number, index: number) => (
                            <div
                                key={ "Set" + index }
                                className={ `flex flex-row justify-center gap-2 items-center w-full py-2` }>
                                <div className="flex items-center justify-start w-[10%]">
                                    { index + 1 }
                                </div>
                                <div className="w-[33%]">
                                    { repTypeValue === "amrap" ? (
                                            <Input
                                                disabled
                                                type="number"
                                                placeholder="AMRAP"
                                                autoFocus
                                            />
                                        ) :
                                            <Input
                                                // type="number"
                                                placeholder={ (repTypeValue === "time_taken" || repTypeValue === "time_range") ? "Secs" : "Reps" }
                                                // inputMode="decimal"
                                                value={ rep || '' }
                                                onInput={ (event) => handleSaveReps(event.currentTarget.value ?? "0", index) }
                                                onBlur={ (event) => handleSaveReps(event.target.value ?? "0", index) }
                                                onKeyDown={ (e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveReps((e.target as HTMLInputElement).value,index);
                                                }
                                                } }
                                                autoFocus
                                            />
                                    }
                                </div>
                                <div className="w-[33%]">
                                    { intensityValue === "rpe_range" ?
                                        <>
                                            <div className="flex flex-row items-center justify-center gap-2">

                                                <Input
                                                    // type="number"
                                                    // inputMode="decimal"
                                                    value={ intensityDataWithRPERange?.[index]?.[0] }
                                                    onInput={ (event) => handleSaveIntensityRange(event.currentTarget.value ?? "0", index,"start") }
                                                    onBlur={ (event) => handleSaveIntensityRange(event.target.value ?? "0", index,"start") }
                                                    onKeyDown={ (e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSaveIntensityRange((e.target as HTMLInputElement).value,index,"start");
                                                    }
                                                    } }
                                                    autoFocus
                                                />
                                                <div style={ { marginRight: "20px" } }>-</div>
                                                <Input
                                                    // type="number"
                                                    // inputMode="decimal"
                                                    value={ intensityDataWithRPERange?.[index]?.[1] }
                                                    onInput={ (event) => handleSaveIntensityRange(event.currentTarget.value ?? "0", index,"end") }
                                                    onBlur={ (e) => handleSaveIntensityRange(e.target.value ?? "0", index,"end") }
                                                    onKeyDown={ (e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSaveIntensityRange((e.target as HTMLInputElement).value,index,"end");
                                                    }
                                                    } }
                                                    autoFocus
                                                />
                                            </div>
                                        </>

                                    :
                                        <Input
                                            // type="number"
                                            // inputMode="decimal"
                                            value={ intensityData[index] || "0" }
                                            onInput={ (e) => handleUpdatingIntensity(e.currentTarget.value ?? "0", index) }
                                            onBlur={ (e) => handleSaveIntensity(e.target.value ?? "0", index) }
                                            onKeyDown={ (e) => {
                                                if (e.key === 'Enter') {
                                                    handleSaveIntensity((e.target as HTMLInputElement).value,index);
                                            }
                                            } }
                                            autoFocus
                                        />
                                }

                                </div>
                                <Trash2Icon className="cursor-pointer" onClick={ () => deleteSet(index) } />
                            </div>

                        ) )


                    :   (repsWithTimeAndRepRange && repsWithTimeAndRepRange.length > 0 && repsWithTimeAndRepRange?.map((repRange: number[], index) => (
                        <div
                            key={ "Set" + index }
                            className={ `flex flex-row justify-center gap-2 items-center w-full py-2` }>
                            <div className="flex items-center justify-start w-[10%]">
                                { index + 1 }
                            </div>
                            <div className="w-[33%]">
                                <div className="flex flex-row items-center justify-center gap-2">
                                    <Input
                                        className="w-full"
                                        // type="number"
                                        placeholder="__"
                                        // inputMode="decimal"
                                        value={ repsWithTimeAndRepRange?.[index]?.[0] }
                                        onInput={ (event) => handleSaveRepsRange(event.currentTarget.value ?? "0", index,"start") }
                                        onBlur={ (event) => handleSaveRepsRange(event.target.value ?? "0", index,"start") }
                                        onKeyDown={ (e) => {
                                            if (e.key === 'Enter') {
                                                handleSaveRepsRange((e.target as HTMLInputElement).value, index,"start");
                                            }
                                        } }
                                        autoFocus
                                    />
                                    <div className="mr-4">-</div>
                                    <Input
                                        // type="number"
                                        placeholder="__"
                                        // inputMode="decimal"
                                        value={ repsWithTimeAndRepRange?.[index]?.[1] }
                                        onInput={ (event) => handleSaveRepsRange(event.currentTarget.value ?? "0", index,"end") }
                                        onBlur={ (event) => handleSaveRepsRange(event.target.value ?? "0", index,"end") }
                                        onKeyDown={ (e) => {
                                            if (e.key === 'Enter') {
                                                handleSaveRepsRange((e.target as HTMLInputElement).value, index,"end");
                                            }
                                        } }
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="w-[33%]">
                                { intensityValue === "rpe_range" ?
                                    <>
                                        <div className="flex flex-row items-center justify-center gap-2">

                                            <Input
                                                // type="number"
                                                // inputMode="decimal"
                                                value={ intensityDataWithRPERange?.[index]?.[0] }
                                                onInput={ (event) => handleSaveIntensityRange(event.currentTarget.value ?? "0", index,"start") }
                                                onBlur={ (event) => handleSaveIntensityRange(event.target.value ?? "0", index,"start") }
                                                onKeyDown={ (e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveIntensityRange((e.target as HTMLInputElement).value,index,"start");
                                                }
                                                } }
                                                autoFocus
                                            />
                                            <div style={ { marginRight: "20px" } }>-</div>
                                            <Input
                                                // type="number"
                                                // inputMode="decimal"
                                                value={ intensityDataWithRPERange?.[index]?.[1] }
                                                onInput={ (event) => handleSaveIntensityRange(event.currentTarget.value ?? "0", index,"end") }
                                                onBlur={ (e) => handleSaveIntensityRange(e.target.value ?? "0", index,"end") }
                                                onKeyDown={ (e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveIntensityRange((e.target as HTMLInputElement).value,index,"end");
                                                }
                                                } }
                                                autoFocus
                                            />
                                        </div>
                                    </>

                                :
                                    <Input
                                        // type="number"
                                        // inputMode="decimal"
                                        value={ intensityData[index] || "0" }
                                        onInput={ (e) => handleUpdatingIntensity(e.currentTarget.value ?? "0", index) }
                                        onBlur={ (e) => handleSaveIntensity(e.target.value ?? "0", index) }
                                        onKeyDown={ (e) => {
                                            if (e.key === 'Enter') {
                                                handleSaveIntensity((e.target as HTMLInputElement).value,index);
                                        }
                                        } }
                                        autoFocus
                                    />
                            }

                            </div>
                            <Trash2Icon className="cursor-pointer" onClick={ () => deleteSet(index) } />
                        </div>
                    )))
                    }
                    </div>
                    <div className="pt-4 flex justify-center items-center" onClick={ () => addSet() }>
                        <Button
                            variant="ghost"
                            className="w-full h-10 mx-14 uppercase"
                        >
                            <PlusIcon /> Add Set
                        </Button>
                    </div>
                </div>
                <span className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                    <span className="w-full flex items-center justify-center">
                        <Button onClick={ () => handleOpenAddExerciseDialog({folder_id: undefined, dayOrder: undefined, isOpen: false} ) } variant="ghost" className="w-full h-12">
                                Cancel
                        </Button>
                    </span>
                    <span className="w-full flex items-center justify-center">
                        <Button
                            onClick={ () => handleSave() }
                            variant="ghost"
                            className="bg-lightSecondary text-white hover:bg-lightSecondary w-full h-12"
                        >
                                {isEditExercise ? "Edit" : "Add"}
                        </Button>
                    </span>
                </span>
            </DialogContent>
        </Dialog>
    );
};

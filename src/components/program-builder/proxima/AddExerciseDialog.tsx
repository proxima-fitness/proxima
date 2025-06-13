"use client";

import { useExercises } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { useEffect, useReducer, useState } from "react";
import { intensities, rep_types } from "@/assets/constants";
import { getExerciseFromLocalStorageByID, getExerciseFromLocalStorageByName } from "@/utils/general/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExpandIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { addExerciseToProgramCreatorExerciseConverter, convertProgramCreatorExerciseToAddExercise } from "../utils";
import { ExerciseSearchBar } from "@/components/program-builder/proxima/ExerciseSearchBar";
import { SetTypesToggle } from "../shared/SetTypesToggle";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";

interface IProps {
    addExerciseDialog: TDialog;
    isEditExercise: boolean;
    handleAddExercise: (weekOrder: number, dayOrder: number, exercise: TProgramCreatorExercise) => void;
    handleEditExercise: (editExercise: TDialog) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: TDialog) => void;
}

export const AddExerciseDialog: React.FC<IProps> = (props) => {

    const {
        addExerciseDialog,
        isEditExercise,
        handleAddExercise,
        handleEditExercise,
        handleOpenAddExerciseDialog,
    } = props;

    const { data: exercises }  = useExercises();

    const [ exerciseID, setExerciseID ] = useState<string>();
    const [ selectedName, setSelectedName ] = useState<string>("");
    const [ selectedGifID, setSelectedGifID ] = useState<string>();
    const [ isEditing, setIsEditing ] = useState(true);
    const [ editSetType, toggleEditSetType ] = useReducer(prev => !prev, false);
    const [ setTypes, setSetTypes ] = useState<("normal" | "warmup" | "dropset" | "failure")[]>(isEditExercise ? addExerciseDialog.editExercise?.setTypes ?? ["normal","normal","normal","normal"] : ["normal","normal","normal","normal"]);

    const handleSetType = (setType: "normal" | "warmup" | "dropset" | "failure", index: number) => {
        const updatedSetTypes = [...setTypes];
        updatedSetTypes[index] = setType;
        setSetTypes(updatedSetTypes);
    };

    const handleIsEditing = (isEditing: boolean) => {
        setIsEditing(isEditing);
    };

    const handleSelected = async (item: TExercise) => {
        const fetchedExerciseItem = await getExerciseFromLocalStorageByName(item.name_english);
        if (fetchedExerciseItem) {
            setExerciseID(fetchedExerciseItem.id);
            setSelectedName(fetchedExerciseItem["name_english"]);
            if (fetchedExerciseItem.gif_id) {
                setSelectedGifID(fetchedExerciseItem.gif_id);
            }
        }
        setIsEditing(false);
    };

    const [ editingSetWeight, setEditingSetWeight ] = useState([false,false,false,false]);

    // 3 SECTIONS: SETS, REPS, INTENSITY. reps and intensity are inputs.
    const [ reps, setReps ] = useState<number[] | undefined>(isEditExercise ? undefined : [8,8,8,8]);
    const [ intensityData, setIntensityData ] = useState<number[] | undefined>(isEditExercise ? undefined : [9,9,9,9]);

    // Data structure is different when rep/time/rpe ranges are used
    const [ repsWithTimeAndRepRange, setRepsWithTimeAndRepRange ] = useState<number[][] | undefined>(isEditExercise ? undefined : [[8,12],[8,12],[8,12],[8,12]]);
    const [ intensityDataWithRPERange, setIntensityDataWithRPERange ] = useState<number[][] | undefined>(isEditExercise ? undefined : [[9,10],[9,10],[9,10],[9,10]]);

    const [ repTypeValue, setRepTypeValue ] = useState(isEditExercise ? undefined : rep_types[0].value);
    const [ intensityValue, setIntensityValue ] = useState(isEditExercise ? undefined : intensities[0].value);

    const handleSaveIntensity = (value: string | number , index: number) => {

        let updatedWeights: number[] = [];

        if (intensityData) {
            updatedWeights = [...intensityData];
        }

        updatedWeights[index] = Number(value);
        setIntensityData(updatedWeights);

        const updatedEditingSetWeight = [...editingSetWeight];
        updatedEditingSetWeight[index] = !updatedEditingSetWeight[index];
        setEditingSetWeight(updatedEditingSetWeight);
	};

    const handleUpdatingIntensity = (value: string | number , index: number) => {
        let updatedIntensities: number[] = [];
        if (intensityData) {
            updatedIntensities = [...intensityData];
        }
        updatedIntensities[index] = Number(value);
        setIntensityData(updatedIntensities);
    };

    const handleSaveReps = (value: string | number , index: number) => {
        let updatedReps: number[] = [];
        if (reps) {
            updatedReps = [...reps];
        }
        updatedReps[index] = Number(value);
        setReps(updatedReps);
	};

    const handleSaveRepsRange = (value: string , index: number, startOrEnd: string) => {
        const valueWithNoDashes = value.replace(/[^0-9]/g, "");
        const innerIndex = startOrEnd === "start" ? 0 : 1;
        let updatedReps: number[][] = [];
        if (repsWithTimeAndRepRange) {
            updatedReps = [...repsWithTimeAndRepRange];
        }
        updatedReps[index][innerIndex] = Number(valueWithNoDashes);
        setRepsWithTimeAndRepRange(updatedReps);
    } ;

    const handleSaveIntensityRange = (value: string | number , index: number, startOrEnd: string) => {
        const innerIndex = startOrEnd === "start" ? 0 : 1;
        let updatedIntensities: number[][] = [];
        if (intensityDataWithRPERange) {
            updatedIntensities = [...intensityDataWithRPERange];
        }
        updatedIntensities[index][innerIndex] = Number(value);
        setIntensityDataWithRPERange(updatedIntensities);
    };

    const handleSave = async () => {
        if (selectedName === "") {
            toast.error("Please select an exercise");
            return;
        }

        const id = exerciseID;
        const exerciseData = { id, repTypeValue, intensityValue, reps, intensityData, repsWithTimeAndRepRange, intensityDataWithRPERange, setTypes };
        const newExercise: TProgramCreatorExercise = await addExerciseToProgramCreatorExerciseConverter(exerciseData as TAddExercise);

        if (isEditExercise) {
            handleEditExercise({isOpen: false, weekOrder: addExerciseDialog.weekOrder, dayOrder: addExerciseDialog.dayOrder, exerciseIndex: addExerciseDialog.exerciseIndex ,editExercise: convertProgramCreatorExerciseToAddExercise(newExercise)});
        } else {
            handleAddExercise(addExerciseDialog.weekOrder, addExerciseDialog.dayOrder, newExercise);
        }

        handleOpenAddExerciseDialog({ weekOrder: 0, dayOrder: 0, isOpen: false});
    };

    const deleteSet = (index: number) => {
        if (reps) {
            setReps(reps.filter((_: number, i: number) => i !== index));
            setSetTypes(setTypes.filter((_,i) => i !== index));
        }
        if (repsWithTimeAndRepRange) {
            setRepsWithTimeAndRepRange(repsWithTimeAndRepRange.filter((_,i) => i !== index));
            setSetTypes(setTypes.filter((_,i) => i !== index));
        }
        if (intensityData) {
            setIntensityData(intensityData.filter((_: number, i: number) => i !== index));
        }
        if (intensityDataWithRPERange) {
            setIntensityDataWithRPERange(intensityDataWithRPERange.filter((_,i) => i !== index));
        }
    };

    const addSet = () => {
        if (repTypeValue === "time_range" || repTypeValue === "reps_range") {
            if (!repsWithTimeAndRepRange) {
                setRepsWithTimeAndRepRange([[8,12]]);
                setSetTypes([...setTypes, "normal"]);
            } else {
                if (repsWithTimeAndRepRange.length < 10) {
                    setRepsWithTimeAndRepRange([...repsWithTimeAndRepRange, [8,12]]);
                    setSetTypes([...setTypes, "normal"]);
                }
            }
        } else {
            if (!reps) {
                setReps([8]);
                setSetTypes([...setTypes, "normal"]);
            } else {
                if (reps.length < 10) {
                    setReps([...reps, 8]);
                    setSetTypes([...setTypes, "normal"]);
                }
            }
        }
        if (!intensityData) {
            setIntensityData([9]);
        } else {
            if (intensityData.length < 10) setIntensityData([...intensityData, 9]);
        }
        if (!intensityDataWithRPERange) {
            setIntensityDataWithRPERange([[9,10]]);
        } else {
            if (intensityDataWithRPERange.length < 10) setIntensityDataWithRPERange([...intensityDataWithRPERange, [9,10]]);
        }
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
    }, [isEditExercise, addExerciseDialog.editExercise?.id, addExerciseDialog.editExercise?.intensityData, addExerciseDialog.editExercise?.intensityDataWithRPERange, addExerciseDialog.editExercise?.intensityValue, addExerciseDialog.editExercise?.repTypeValue, addExerciseDialog.editExercise?.reps, addExerciseDialog.editExercise?.repsWithTimeAndRepRange]);

    return (
        <Drawer open={ addExerciseDialog.isOpen } onOpenChange={ () => handleOpenAddExerciseDialog({ weekOrder: 0, dayOrder: 0, isOpen: false} ) }>
            <DrawerContent
                className="max-h-[98%] sm:max-h-[100%] sm:max-w-[50%]"
            >
                <div className="overflow-y-scroll mx-auto w-full max-w-3xl">
                <DrawerTitle className="font-bold flex items-center justify-center">
                    Add Exercise to Week {addExerciseDialog.weekOrder + 1} Day {addExerciseDialog.dayOrder}
                </DrawerTitle>
                <div className={ "modal-content__centered" }>
                    { exercises &&
                        <ExerciseSearchBar
                            title={ "Exercise" }
                            items={ exercises }
                            handleSelected= { handleSelected }
                            selectedName={ selectedName }
                            selectedGifID={ selectedGifID }
                            isEditing={ isEditing }
                            handleIsEditing={ handleIsEditing }
                        />
                    }
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
                            { editSetType ?
                                <XIcon className="cursor-pointer" onClick={ toggleEditSetType } />
                                :
                                <TooltipProvider delayDuration={ 0 }>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <ExpandIcon className="cursor-pointer" onClick={ toggleEditSetType } />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                            Edit Set Types
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            }
                        </div>
                        </div>

                        { (reps && reps.length > 0) ? reps?.map((rep: string | number, index: number) => (
                            <div
                                key={ "Set" + index }
                                className={ `flex flex-row justify-center gap-2 items-center w-full py-1 ${ setTypes[index] === "warmup" ? "bg-gray-300" : setTypes[index] === "dropset" ? "bg-[#33bbcf]" : setTypes[index] === "failure" ? "bg-[#01579B]" : "" }` }>
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
                                            value={ intensityData?.[index] ?? "0" }
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
                                { editSetType && <SetTypesToggle setIndex={ index } setType={ setTypes[index] } handleSetType={ handleSetType } /> }
                                <Trash2Icon className="cursor-pointer" onClick={ () => deleteSet(index) } />
                            </div>

                        ) ) : (repsWithTimeAndRepRange && repsWithTimeAndRepRange.length > 0 && repsWithTimeAndRepRange?.map((repRange: number[], index) => (
                        <div
                            key={ "Set" + index }
                            className={ `flex flex-row justify-center gap-2 items-center w-full py-1 ${ setTypes[index] === "warmup" ? "bg-gray-300" : setTypes[index] === "dropset" ? "bg-[#33bbcf]" : setTypes[index] === "failure" ? "bg-[#01579B]" : "" }` }>
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
                                        value={ intensityData?.[index] ?? "0" }
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
                            { editSetType && <SetTypesToggle setIndex={ index } setType={ setTypes[index] } handleSetType={ handleSetType } /> }
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
                </div>
                <DrawerFooter className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                    <span className="w-full flex items-center justify-center">
                        <Button onClick={ () => handleOpenAddExerciseDialog({weekOrder: 0, dayOrder: 0, isOpen: false} ) } variant="ghost" className="w-full h-12">
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
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};

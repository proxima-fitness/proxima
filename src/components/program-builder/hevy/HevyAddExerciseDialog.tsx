"use client";

import { useHevyExercises } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { useEffect, useReducer, useState } from "react";
import { hevy_intensities, hevy_rep_types } from "@/assets/constants";
import { getHevyExerciseFromLocalStorageByID, getHevyExerciseFromLocalStorageByName } from "@/utils/general/helpers";
import { toast } from "sonner";
import { ExpandIcon, PlusIcon, TimerIcon, Trash2Icon, XIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HevyExerciseSearchBar } from "./HevyExerciseSearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { SetTypesLegend } from "../shared/SetTypesLegend";
import { SetTypesToggle } from "../shared/SetTypesToggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";

interface IProps {
    addExerciseDialog: THevyDialog;
    isEditExercise: boolean;
    handleAddExercise: (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => void;
    handleEditExercise: (editExercise: THevyDialog) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
}

export const HevyAddExerciseDialog: React.FC<IProps> = (props) => {

    const {
        addExerciseDialog,
        isEditExercise,
        handleAddExercise,
        handleEditExercise,
        handleOpenAddExerciseDialog,
    } = props;

    const { data: exercises, isLoading: loadingHevyExercises } = useHevyExercises();

    const [ exerciseID, setExerciseID ] = useState<string>();
    const [ selectedName, setSelectedName ] = useState<string>("");
    const [ isEditing, setIsEditing ] = useState(true);
    const [ editSetType, toggleEditSetType ] = useReducer(prev => !prev, false);

    const handleIsEditing = (isEditing: boolean) => {
        setIsEditing(isEditing);
    };

    const handleSelected = async (item: THevyExerciseTemplate) => {
        const fetchedExerciseItem = await getHevyExerciseFromLocalStorageByName(item.title);
        if (fetchedExerciseItem) {
            setExerciseID(fetchedExerciseItem.id);
            setSelectedName(fetchedExerciseItem.title);
        }
        setIsEditing(false);
    };

    const [ editingSetWeight, setEditingSetWeight ] = useState([false,false,false,false]);
    const [ restTimeOpen, setRestTimeOpen ] = useState(false);
    const [ restSeconds, setRestSeconds ] = useState(isEditExercise ? addExerciseDialog.editExercise?.restSeconds ?? "0" : "0");

    // 3 SECTIONS: SETS, REPS, INTENSITY. reps and intensity are inputs.
    const [ reps, setReps ] = useState<number[] | undefined>(isEditExercise ? undefined : [8,8,8,8]);
    const [ setTypes, setSetTypes ] = useState<("normal" | "warmup" | "dropset" | "failure")[]>(isEditExercise ? addExerciseDialog.editExercise?.setTypes ?? ["normal","normal","normal","normal"] : ["normal","normal","normal","normal"]);

    const [ intensityData, setIntensityData ] = useState<number[] | undefined>(isEditExercise ? undefined : [9,9,9,9]);

    const [ repTypeValue, setRepTypeValue ] = useState(isEditExercise ? undefined : hevy_rep_types[0].value);
    const [ intensityValue, setIntensityValue ] = useState(isEditExercise ? undefined : hevy_intensities[0].value);

    const handleSetType = (value: "normal" | "warmup" | "dropset" | "failure", index: number) => {
        const updatedSetTypes = [...setTypes];
        updatedSetTypes[index] = value;
        setSetTypes(updatedSetTypes);
    };

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


    const handleSave = async () => {
        if (selectedName === "") {
            toast.error("Please select an exercise");
            return;
        }

        const id = exerciseID;
        const exerciseData = { id, repTypeValue, intensityValue, reps, intensityData, setTypes, restSeconds };
        const newExercise = (exerciseData as THevyAddExercise);

        if (isEditExercise) {
            handleEditExercise({isOpen: false, folder_id: addExerciseDialog.folder_id, dayOrder: addExerciseDialog.dayOrder, exerciseIndex: addExerciseDialog.exerciseIndex ,editExercise: newExercise});
        } else {
            handleAddExercise(addExerciseDialog.folder_id, addExerciseDialog.dayOrder, newExercise);
        }

        handleOpenAddExerciseDialog({ folder_id: 0, dayOrder: 0, isOpen: false});
    };

    const deleteSet = (index: number) => {
        if (reps) {
            setReps(reps.filter((_: number, i: number) => i !== index));
            setSetTypes(setTypes.filter((_: string, i: number) => i !== index));
        }
        if (intensityData) {
            setIntensityData(intensityData.filter((_: number, i: number) => i !== index));
        }
    };

    const addSet = () => {
        if (!reps) {
            setReps([8]);
        } else {
            if (reps.length < 10)
                {
                    setReps([...reps, 8]);
                    setSetTypes([...setTypes, "normal"]);
                }
        }
        if (!intensityData) {
            setIntensityData([9]);
        } else {
            if (intensityData.length < 10) setIntensityData([...intensityData, 9]);
        }
    };

    const handleSwapRepTypeValue = (value: string) => {
        setRepTypeValue(value);
        setReps([8,8,8,8]);
    };

    useEffect(() => {
        const getExercise = async () => {
            const exercise = await getHevyExerciseFromLocalStorageByID(addExerciseDialog?.editExercise?.id);
            setExerciseID(addExerciseDialog?.editExercise?.id);
            setRepTypeValue(addExerciseDialog?.editExercise?.repTypeValue ?? hevy_rep_types[0].value);
            setIntensityData(addExerciseDialog?.editExercise?.intensityData ?? [9,9,9,9]);
            setReps(addExerciseDialog?.editExercise?.reps ?? [8,8,8,8]);
            setIntensityValue(addExerciseDialog?.editExercise?.intensityValue ?? hevy_intensities[0].value);

            if (exercise) {
                setSelectedName(exercise[`title`]);
            }
        };
        if (isEditExercise) {
            setIsEditing(false);
            getExercise();
        }
    }, [isEditExercise, addExerciseDialog.editExercise?.id, addExerciseDialog.editExercise?.intensityData, addExerciseDialog.editExercise?.intensityValue, addExerciseDialog.editExercise?.repTypeValue, addExerciseDialog.editExercise?.reps]);

    return (
        <Drawer
            open={ addExerciseDialog.isOpen }
            modal={ addExerciseDialog.isOpen }
            onOpenChange={
                () => handleOpenAddExerciseDialog({ folder_id: 0, dayOrder: 0, isOpen: false} )
            }
        >
            <DrawerContent
                className="max-h-[98%] sm:max-h-[100%] sm:max-w-[50%]"
            >
                <div className="overflow-y-scroll mx-auto w-full max-w-3xl">
                    <DrawerTitle className="font-bold flex items-center justify-center">
                        Add Exercise to Week {addExerciseDialog.folder_id + 1} Day {addExerciseDialog.dayOrder}
                    </DrawerTitle>
                    { loadingHevyExercises ?
                        <div style={ { display: "flex",width: "100%", height: "358px", textAlign: "center", justifyContent: "center", alignItems: "center"} }>
                            <Skeleton className="w-full h-full"></Skeleton>
                        </div>
                    : exercises !== undefined &&
                        <HevyExerciseSearchBar
                            title={ "Exercise" }
                            items={ exercises }
                            handleSelected= { handleSelected }
                            selectedName={ selectedName }
                            isEditing={ isEditing }
                            handleIsEditing={ handleIsEditing }
                        />
                    }
                        <SetTypesLegend />

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
                                        { hevy_rep_types.map((rep_type) => (
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
                                        { hevy_intensities.map((intensity) => (
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

                        { (reps && reps.length > 0) && reps?.map((rep: string | number, index: number) => (
                            <div
                                key={ "Set" + index }
                                className={ `flex flex-row justify-center gap-2 items-center w-full py-1 ${ setTypes[index] === "warmup" ? "bg-gray-300" : setTypes[index] === "dropset" ? "bg-[#33bbcf]" : setTypes[index] === "failure" ? "bg-[#01579B]" : "" }` }>
                                <div className="flex items-center justify-start w-[10%]">
                                    { index + 1 }
                                </div>
                                <div className="w-[33%]">
                                    <Input
                                        type="number"
                                        placeholder={ (repTypeValue === "duration_seconds") ? "Secs" : repTypeValue === "distance_meters" ? "Meters" : "Reps" }
                                        inputMode="decimal"
                                        autoFocus
                                        value={ rep || '' }
                                        onInput={ (event) => handleSaveReps(event.currentTarget.value ?? "0", index) }
                                        onBlur={ (event) => handleSaveReps(event.target.value ?? "0", index) }
                                        onKeyDown={ (e) => {
                                            if (e.key === 'Enter') {
                                                handleSaveReps((e.target as HTMLInputElement).value,index);
                                        }
                                        } }
                                    />
                                </div>
                                <div className="w-[33%]">
                                    <Input
                                        type="number"
                                        inputMode="decimal"
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
                                </div>
                                { editSetType && <SetTypesToggle setIndex={ index } setType={ setTypes[index] } handleSetType={ handleSetType } /> }
                                <Trash2Icon className="cursor-pointer" onClick={ () => deleteSet(index) } />
                            </div>
                        ) )

                    }
                    <div className="pt-4 px-20 flex justify-center items-center gap-2">
                        <Button
                            onClick={ () => addSet() }
                            variant="ghost"
                            className="w-full h-10 uppercase"
                        >
                            <PlusIcon /> Add Set
                        </Button>
                        { !restTimeOpen &&
                            <Button onClick={ () => setRestTimeOpen(true) } variant="ghost" className="w-full h-10 uppercase">
                                <TimerIcon /> Rest Time
                            </Button>
                        }
                        { restTimeOpen && <Input type="number" placeholder="Rest Time (secs)" value={ restSeconds } onChange={ (e) => setRestSeconds(e.target.value) } /> }
                    </div>
                    </div>
                </div>

                    <DrawerFooter className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                        <span className="w-full flex items-center justify-center">
                            <Button onClick={ () => handleOpenAddExerciseDialog({folder_id: 0, dayOrder: 0, isOpen: false} ) } variant="ghost" className="w-full h-12">
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

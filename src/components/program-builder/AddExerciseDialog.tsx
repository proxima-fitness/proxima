"use client";

import { useExercises } from "@/api/hooks";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { intensities, rep_types } from "@/assets/constants";
import { addExerciseToProgramCreatorExerciseConverter, getExerciseFromLocalStorageByID, getExerciseFromLocalStorageByName } from "@/utils/helpers";
import { ExerciseSearchBar } from "../generic/ExerciseSearchBar";
import { Select, SelectContent, SelectItem } from "../ui/select";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";

interface IProps {
    handleAddExercise: (currentWeek: number, currentDay: number, exercise: TProgramCreatorExercise) => void;
    addExerciseDialog: TDialog;
    handleAddExerciseDialog: (addExerciseDialog: TDialog) => void;
}

export const AddExerciseDialog: React.FC<IProps> = (props) => {

    const {
        addExerciseDialog,
        handleAddExercise,
        handleAddExerciseDialog,
    } = props;

    const { data: exercises }  = useExercises();

    const [title, setTitle] = useState<string>();

    const [ editedExercise, setEditedExercise ] = useState<TAddExercise | undefined>();
    const [ isEditConfirmed, setIsEditConfirmed] = useState<boolean>(false);

    const [ exerciseID, setExerciseID ] = useState<string>();
    const [ selectedName, setSelectedName ] = useState<string>('');
    const [ selectedGifID, setSelectedGifID ] = useState<string>();
    const [ isEditing, setIsEditing ] = useState(true);

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
    const [ addSetToastOpen, setAddSetToastOpen ] = useState(false);

    // 3 SECTIONS: SETS, REPS, INTENSITY. reps and intensity are inputs.
    const [ reps, setReps ] = useState<number[]>([8,8,8,8]);
    const [ intensityData, setIntensityData ] = useState<number[]>([9,9,9,9]);

    // Data structure is different when rep/time/rpe ranges are used
    const [ repsWithTimeAndRepRange, setRepsWithTimeAndRepRange ] = useState<number[][]>([[8,12],[8,12],[8,12],[8,12]]);
    const [ intensityDataWithRPERange, setIntensityDataWithRPERange ] = useState<number[][]>([[9,10],[9,10],[9,10],[9,10]]);

    const [ repTypeValue, setRepTypeValue ] = useState(rep_types[0].value);
    const [ intensityValue, setIntensityValue ] = useState(intensities[0].value);

    const handleMaxTenSets = () => {
        toast("Maximum of 10 sets can be added.");
    }
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

    const handleSaveRepsRange = (value: string  , index: number, startOrEnd: string) => {
        const valueWithNoDashes = value.replace(
            /[^a-zA-Z\s]/g,
            "",
        );
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
        const id = exerciseID;
        const exerciseData = { id, repTypeValue, intensityValue, reps, intensityData, repsWithTimeAndRepRange, intensityDataWithRPERange };
        const newExercise: TProgramCreatorExercise = await addExerciseToProgramCreatorExerciseConverter(exerciseData as TAddExercise);
        handleAddExercise(addExerciseDialog.currentWeek, addExerciseDialog.currentDay, newExercise);
        handleAddExerciseDialog({ currentWeek: undefined, currentDay: undefined, isOpen: false});
    };

    const deleteSet = (index: number) => {
        setReps(reps.filter((_: number, i: number) => i !== index));
        setIntensityData(intensityData.filter((_: number, i: number) => i !== index));
        setIntensityDataWithRPERange(intensityDataWithRPERange.filter((_,i) => i !== index));
    };

    const addSet = () => {
        if (reps.length < 10) setReps([...reps, 8]);
        if (repsWithTimeAndRepRange.length < 10) setRepsWithTimeAndRepRange([...repsWithTimeAndRepRange, [8,12]]);
        if (intensityDataWithRPERange.length < 10) setIntensityDataWithRPERange([...repsWithTimeAndRepRange, [8,12]]);
    };

    useEffect(() => {
        const getTitle = async () => {
          const exercise = await getExerciseFromLocalStorageByID(exerciseID);
          if (exercise) {
            const title = exercise[`name_english` as keyof typeof exercise];
            setTitle(title as string);
          } else {
            setTitle("");
          }
        };

        getTitle();
      }, [exerciseID]);

    useEffect(() => {
        const getExercise = async () => {
            const exercise = await getExerciseFromLocalStorageByID(editedExercise?.id);
            setExerciseID(editedExercise?.id);
            setRepsWithTimeAndRepRange(editedExercise?.repsWithTimeAndRepRange ?? [[8,12],[8,12],[8,12],[8,12]]);
            setIntensityDataWithRPERange(editedExercise?.intensityDataWithRPERange ?? [[9,10],[9,10],[9,10],[9,10]]);
            setReps(editedExercise?.reps ?? [8,8,8,8]);
            setRepTypeValue(editedExercise?.repTypeValue ?? rep_types[0].value);
            setIntensityData(editedExercise?.intensityData ?? [9,9,9,9]);
            setIntensityValue(editedExercise?.intensityValue ?? intensities[0].value);
            if (exercise) {
                setSelectedName(exercise[`name_english`]);
                setSelectedGifID(exercise.gif_id);
            }
        };
    }, [editedExercise?.id, editedExercise?.intensityData, editedExercise?.intensityDataWithRPERange, editedExercise?.intensityValue, editedExercise?.repTypeValue, editedExercise?.reps, editedExercise?.repsWithTimeAndRepRange]);



    return (
        <Dialog open={ addExerciseDialog.isOpen } onOpenChange={ () => handleAddExerciseDialog({ currentWeek: undefined, currentDay: undefined, isOpen: false} )}>
            <DialogContent hideClose className="max-w-3xl w-full">
                <DialogTitle className="font-bold flex items-center justify-center pb-4 border-b-2">
                    Add Exercise to Week {addExerciseDialog.currentWeek + 1} Day {addExerciseDialog.currentDay}
                </DialogTitle>
                <div className={ "modal-content__centered" }>
                    <ExerciseSearchBar
                        title={ "Exercise" }
                        items={ exercises }
                        handleSelected= { handleSelected }
                        selectedName={ selectedName }
                        selectedGifID={ selectedGifID }
                        isEditing={ isEditing }
                        handleIsEditing={ handleIsEditing }
                    />
                    <div className="mt-4">

                            <div className="flex flex-row justify-center gap-2 items-center w-full">
                                <div className="flex items-start justify-start w-[10%]">
                                        Set
                                </div>
                                <div className="w-[33%]">
                                    Reps
                                    {/* <Select value={ repTypeValue } aria-label="rep type" onValueChange={ (value) => setRepTypeValue(value) }>
                                        <SelectContent>
                                            { rep_types.map((rep_type) => (
                                                <SelectItem key={ rep_type.value } value={ rep_type.value }>{ rep_type.label }</SelectItem>
                                            ) ) };
                                        </SelectContent>

                                    </Select> */}
                                </div>
                                <div className="w-[33%]">
                                    Intensity
                                    {/* <Select value={ intensityValue } aria-label="intensity" onValueChange={ (value) => setIntensityValue(value) }>
                                        <SelectContent>
                                            { intensities.map((intensity) => (
                                                <SelectItem key={ intensity.value } value={ intensity.value }>{ intensity.label }</SelectItem>
                                            ) ) };
                                        </SelectContent>
                                    </Select> */}
                                </div>
                                <div>
                                    <XIcon className="opacity-0 pointer-events-none" />
                                </div>
                            </div>

                        { reps.map((rep: string | number, index: number) => (
                            <div
                                key={ "Set" + index }
                                className={ `flex flex-row justify-center gap-2 items-center w-full py-2` }>
                                <div className="flex items-center justify-start w-[10%]">
                                    { index + 1 }
                                </div>
                                <div className="w-[33%]">
                                    { (repTypeValue === "time_range" || repTypeValue === "reps_range") ?
                                        <div className="flex flex-row items-center justify-center gap-2">
                                            <Input
                                                className="w-full"
                                                // type="number"
                                                placeholder="__"
                                                // inputMode="decimal"
                                                value={ repsWithTimeAndRepRange?.[index]?.[0] }
                                                onInput={ (event) => handleSaveRepsRange(String(event.currentTarget.value) ?? "0", index,"start") }
                                                onBlur={ (event) => handleSaveRepsRange(String(event.target.value) ?? "0", index,"start") }
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
                                                onInput={ (event) => handleSaveRepsRange(String(event.currentTarget.value) ?? "0", index,"end") }
                                                onBlur={ (event) => handleSaveRepsRange(String(event.target.value) ?? "0", index,"end") }
                                                onKeyDown={ (e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSaveRepsRange((e.target as HTMLInputElement).value, index,"end");
                                                    }
                                                } }
                                                autoFocus
                                            />
                                        </div> : repTypeValue === "amrap" ? (
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

                        ) ) }
                    </div>

                    <div className="pt-4 flex justify-center items-center" onClick={ () => addSet() }>
                        <Button
                            onClick={ () => { if (reps.length === 10) { handleMaxTenSets(); } } }
                            variant="ghost"
                            className="w-full h-10 mx-14 uppercase"
                        >
                            <PlusIcon /> Add Set
                        </Button>
                    </div>
                </div>
                <span className="flex flex-row justify-between items-center gap-2 border-t-2 pt-4">
                    <span className="w-full flex items-center justify-center">
                        <Button onClick={ () => handleAddExerciseDialog({currentWeek: undefined, currentDay: undefined, isOpen: false} ) } variant="ghost" className="w-full h-12">
                                Cancel
                        </Button>
                    </span>
                    <span className="w-full flex items-center justify-center">
                        <Button
                            onClick={ () => handleSave() }
                            variant="ghost"
                            className="bg-lightSecondary text-white hover:bg-lightSecondary w-full h-12"
                        >
                                Add
                        </Button>
                    </span>
                </span>
            </DialogContent>
        </Dialog>
    );
};

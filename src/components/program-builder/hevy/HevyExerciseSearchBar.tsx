/* eslint-disable react-hooks/set-state-in-effect */
/**
 * @module HevyExerciseSearchBar
 * Searchable list of Hevy exercise templates: fuzzy search via Fuse, virtual list for performance.
 * Two modes: editing (search input + scrollable list) or selected (show chosen exercise and image; click to edit).
 * Depends on: HevyExerciseGif, Input, react-window FixedSizeList, Fuse.js, use-mobile.
 * Used by: HevyAddExerciseDialog.
 */

import { useEffect, useState } from 'react';
import { FixedSizeList as List } from "react-window";
import Fuse from "fuse.js";
import { EditIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { HevyExerciseGif } from './HevyExerciseGif';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

// Fuse Fuzzy match options
const options = {
    isCaseSensitive: false,
    includeScore: false,
    minMatchCharLength: 2,
    shouldSort: true,
    threshold: 0.1,
    keys: [
        "title",
    ],
};

/** Props for the exercise search bar (list + selection display). */
interface IProps {
    /** Full list of exercise templates to search/filter. */
    items: THevyExerciseTemplate[];
    /** Currently selected exercise (shown when not editing). */
    selectedExercise: THevyExerciseTemplate | undefined;
    /** When true, show search input and list; when false, show selected exercise and image. */
    isEditing: boolean;
    /** Called when user picks an exercise from the list. */
    handleSelectedExercise: (item: THevyExerciseTemplate) => Promise<void>;
    /** Called to switch to edit mode (show search/list). */
    handleIsEditing: (isEditing: boolean) => void;
    /** Optional label (e.g. "Exercise"). */
    title?: string;
    /** Optional callback when selection is cancelled. */
    onSelectionCancel?: () => void;
    /** When set, shows a "+ Custom Exercise" control to the right of the search bar (editing mode only); on mobile, icon-only + button. */
    onCreateCustomExercise?: () => void;
}

/** Item data passed to each row in the virtual list. */
interface IRowData {
    filteredItems: THevyExerciseTemplate[];
    selectItem: (item: THevyExerciseTemplate) => void;
}

/** Row component props for react-window. */
interface IRowProps {
    index: number;
    style: React.CSSProperties;
    data: IRowData;
}

/**
 * Renders either search input + virtual list of exercises (editing) or selected exercise + image (click to edit).
 */
export const HevyExerciseSearchBar: React.FC<IProps> = (props) => {

    const {
        items,
        selectedExercise,
        isEditing,
        handleIsEditing,
        handleSelectedExercise,
        onCreateCustomExercise,
    } = props;

    const isMobile = useIsMobile();

    const [ filteredItems, setFilteredItems ] = useState<THevyExerciseTemplate[]>(items);

    // TODO: Add these filters back in for the Hevy schema
    // const [ selectedMuscleGroup, setSelectedMuscleGroup ] = useState<string>("All Muscle Groups");
    // const [ selectedEquipment, setSelectedEquipment ] = useState<string>("All Equipment");
    // const [ appliedMuscleGroupFilter, setAppliedMuscleGroupFilter ] = useState<string>();
    const [ appliedSearchBarFilter, setAppliedSearchBarFilter ] = useState<string>();
    // const [ appliedEquipmentFilter, setAppliedEquipmentFilter ] = useState<string>();

    useEffect(() => {
            let filteredItems = items;
            // if (appliedMuscleGroupFilter && appliedMuscleGroupFilter !== "All Muscle Groups") {
            //     const MuscleGroupsKey = MuscleGroups.find(pair => pair.value === appliedMuscleGroupFilter);
            //     if (MuscleGroupsKey) filteredItems = filteredItems.filter((item: TExercise) => item.muscleGroups.includes(MuscleGroupsKey.label));
            // }
            // if (appliedEquipmentFilter && appliedEquipmentFilter !== "All Equipment")  {
            //     const EquipmentKey = Equipment.find(pair => pair.value === appliedEquipmentFilter);
            //     if (EquipmentKey) filteredItems = filteredItems.filter((item: TExercise) => item.equipment.includes(EquipmentKey?.label));
            // }
            if (appliedSearchBarFilter && appliedSearchBarFilter.trim() !== "") {
                const normalizedQuery = appliedSearchBarFilter.toLowerCase();
                const fuse = new Fuse(filteredItems, options);
                const fuseResults  = fuse?.search(normalizedQuery);
                filteredItems = fuseResults?.map(result => result?.item);
            }
            setFilteredItems(filteredItems);
    }, [appliedSearchBarFilter, items]);

    const selectItem = (item: THevyExerciseTemplate) => {
        handleSelectedExercise(item);
    };

    const ExerciseSearchBarRow: React.FC<IRowProps> = (props) => {

        const {
            index,
            style,
            data,
        } = props;

        const item = data.filteredItems[index];

        return (
            <div
                key={ item.id }
                style={ style }
                onClick={ () => data.selectItem(item) }
                className='h-full w-full flex flex-row gap-4 cursor-pointer items-center'
            >
                <HevyExerciseGif
                    thumbnailOrImage="thmb"
                    name={ item.title }
                    gif_id={ item?.gif_id }
                    resolution="180"
                    file_type="jpg"
                />
                <div
                    className="w-full flex flex-col justify-center items-start h-14"
                >
                    { item.title }
                    {/* <span style={ { fontSize: '10px' } }>
                        { item.muscleGroups.map((muscleGroup, index) => (
                            <span key={ index }>
                                {muscleGroup[language]}
                                {index < item.muscleGroups.length - 1 ? ', ' : ''}
                            </span>
                                ) ) }
                    </span> */}
                </div>
            </div>
        );
    };

    return (
        <>
            { isEditing ? (
                <>
                    <div className="my-2 flex w-full flex-row items-center gap-2">
                        <Input
                            containerClassName="min-w-0 flex-1"
                            startIcon={ SearchIcon }
                            placeholder={ "Search Exercises" }
                            onChange={ (event) => setAppliedSearchBarFilter(String(event.target.value)) }
                        />
                        { onCreateCustomExercise ? (
                            isMobile ? (
                                <button
                                    type="button"
                                    onClick={ onCreateCustomExercise }
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lightSecondary hover:bg-accent/60"
                                    aria-label="Custom Exercise"
                                >
                                    <PlusIcon className="h-5 w-5 shrink-0" aria-hidden />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={ onCreateCustomExercise }
                                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium text-lightSecondary hover:underline"
                                >
                                    <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
                                    Custom Exercise
                                </button>
                            )
                        ) : null }
                    </div>
                    {/* <IonItem style={ { "--border-style" : "none", "--border-width" : "0px"  } }>
                        <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "100%", gap: "52px" } }>
                            <IonSelect
                                value={ selectedMuscleGroup }
                                aria-label={ "Filter by Muscle Group" }
                                interface="action-sheet"
                                onIonChange={ (e) => { setAppliedMuscleGroupFilter(e.detail.value); setSelectedMuscleGroup(e.detail.value); } }
                            >
                                { MuscleGroups.map((muscle) => (
                                    <IonSelectOption key={ muscle.value } value={ muscle.value }>{ muscle.label[language] }</IonSelectOption>
                                ))};
                            </IonSelect>
                            <IonSelect
                                style={ { width: "100%" } }
                                value={ selectedEquipment }
                                aria-label={ FilterEquipment[language] }
                                interface="action-sheet"
                                onIonChange={ (e) => { setAppliedEquipmentFilter(e.detail.value); setSelectedEquipment(e.detail.value); } }
                            >
                                { Equipment.map((equip) => (
                                    <IonSelectOption key={ equip.value } value={ equip.value }>{ equip.label[language] }</IonSelectOption>
                                ))};
                            </IonSelect>
                        </div>
                    </IonItem> */}
                    <List
                        height={ 320 }
                        itemCount={ filteredItems.length }
                        itemSize={ 80 }
                        width={ '100%' }
                        itemData={ { filteredItems, selectItem } }
                        >
                        { ExerciseSearchBarRow }
                    </List>
                </>
            ) :
            (
                <div onClick={ () => handleIsEditing(true) }>
                        <center><h2 className="flex flex-row gap-2 items-center justify-center cursor-pointer">{ selectedExercise?.title }<EditIcon className="w-4 h-4" /></h2></center>
                    <HevyExerciseGif
                        name={ selectedExercise?.title ?? "" }
                        gif_id={ selectedExercise?.gif_id }
                        thumbnailOrImage={ "img" }
                        resolution={ "360" }
                        file_type={ "gif" }
                    />
                </div>
            )}
        </>
  );
};

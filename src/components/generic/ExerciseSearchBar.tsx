import { useEffect, useState } from "react";
import Fuse from "fuse.js";
import { Input } from "../ui/input";
import { ExerciseGif } from "./ExerciseGif";
import { SearchIcon } from "lucide-react";
import { FixedSizeList as List } from 'react-window';

// Fuse Fuzzy match options
const options = {
  isCaseSensitive: false,
  includeScore: false,
  minMatchCharLength: 2,
  shouldSort: true,
  threshold: 0.1,
  keys: ["name_english"],
};

interface IProps {
  items: TExercise[];
  selectedName: string;
  selectedGifID: string | undefined;
  isEditing: boolean;
  handleSelected: (item: TExercise) => Promise<void>;
  handleIsEditing: (isEditing: boolean) => void;
  title?: string;
  onSelectionCancel?: () => void;
}

interface RowData {
  filteredItems: TExercise[];
  selectItem: (item: TExercise) => void;
//   language: "english" | "espanol" | "portugues" | "francais";
}

// Define the Row component props
interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: RowData;
}

export const ExerciseSearchBar: React.FC<IProps> = (props) => {

    const {
        items,
        selectedName,
        selectedGifID,
        isEditing,
        handleIsEditing,
        handleSelected,
    } = props;

    const [filteredItems, setFilteredItems] = useState<TExercise[]>(items);

    // const [ selectedMuscleGroup, setSelectedMuscleGroup ] = useState<string>("All Muscle Groups");
    // const [ selectedEquipment, setSelectedEquipment ] = useState<string>("All Equipment");
    // const [appliedMuscleGroupFilter, setAppliedMuscleGroupFilter] = useState<string>();
    const [appliedSearchBarFilter, setAppliedSearchBarFilter] = useState<string>();
    // const [appliedEquipmentFilter, setAppliedEquipmentFilter] = useState<string>();

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
            const fuseResults = fuse.search(normalizedQuery);
            filteredItems = fuseResults.map((result) => result?.item);
        }
        setFilteredItems(filteredItems);
    }, [
        appliedSearchBarFilter,
        items,
    ]);

    const selectItem = (item: TExercise) => {
        handleSelected(item);
    };

    const ExerciseSearchBarRow: React.FC<RowProps> = (props) => {

        const { index, style, data } = props;
        const item = data.filteredItems[index];

        return (
            <div key={ item.id } style={ style }>
                <div
                    onClick={ () => data.selectItem(item) }
                    className="h-full w-full flex flex-row gap-4 cursor-pointer items-center"
                >
                    <ExerciseGif
                        thumbnailOrImage="thmb"
                        name={ item.name_english }
                        gif_id={ item?.gif_id }
                        resolution="180"
                        file_type="jpg"
                    />
                    <div className="w-full flex flex-col justify-center items-start h-14">
                        {item.name_english}
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
            </div>
        );
    };

    return (
        <>
            {isEditing ? (
                <>
                    <Input
                        className="my-2"
                        startIcon={ SearchIcon }
                        autoFocus
                        placeholder={ "Search Exercises" }
                        onChange={ (event) => setAppliedSearchBarFilter(String(event.target.value)) }
                    />
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
                        height={ 480 }
                        itemCount={ filteredItems.length }
                        itemSize={ 80 }
                        width={ '100%' }
                        itemData={ { filteredItems, selectItem } }
                    >
                        { ExerciseSearchBarRow }
                    </List>
                </>
                ) : (
                    <div onClick={ () => handleIsEditing(true) }>
                        <center><h2>{ selectedName }</h2></center>
                        { selectedGifID && selectedGifID.length > 0 &&
                            <>
                                <ExerciseGif name={ selectedName } thumbnailOrImage={ "img" } gif_id={ selectedGifID } resolution={ "360" } file_type={ "gif" } />
                            </>
                        }
                    </div>
                ) }
        </>
    );
};

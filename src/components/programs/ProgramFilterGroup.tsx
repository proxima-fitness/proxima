"use client";

import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Slider } from "@/components/ui/slider";
import { ComboBox } from "../generic/ComboBox";

interface IProps {
    filter: { title: "Program Length" | "Workout Duration" | "Equipment" | "Specialization" | "Difficulty"; type: "badge" | "combobox" | "slider"; values: string[]; }
    clearFilters: boolean;
    handleClearFilters: (clearFilters: boolean) => void;
}

export const ProgramFilterGroup: React.FC<IProps> = (props) => {

    const { filter, clearFilters, handleClearFilters } = props;

    const [sliderValue, setSliderValue] = useState([60]);
    const [selectedFilters, setSelectedFilters] = useState(
        filter.values.map((filter) => ({ [`${filter}`]: false })),
    );

    useEffect(() => {
        if (clearFilters) {
            setSelectedFilters(filter.values.map((filter) => ({ [`${filter}`]: false })));
            handleClearFilters(false);
        }
    }, [clearFilters]);

    const handleSelectedFilters = (filterKey: string) => {
        setSelectedFilters((prevFilters) =>
            prevFilters.map((f) => {
                const key = Object.keys(f)[0];
                return key === filterKey ? { [key]: !f[key] } : f;
            }),
        );
    };

    return (
        <div className="px-2 pt-4">
            <div className="text-sm">{filter.title}</div>
            { filter.type === "badge" ? (
                <div className="flex flex-row gap-2 flex-wrap pt-2">
                    { selectedFilters.map((filter) => {
                    const key = Object.keys(filter)[0];
                    return (
                        <Badge onClick={ () => handleSelectedFilters(key) } key={ key } className={ `p-2 cursor-pointer ${filter[key] ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white hover:text-white" : "bg-white hover:bg-white"}  ` }>{key}</Badge>
                    );
                } ) }
                </div>
            ) : filter.type === "combobox" ?
            (
                <div className="pt-2">
                    <ComboBox options={ filter.values } title={ filter.title } />
                </div>
            ) : filter.type === "slider" ?
            (
                <div className="py-4">
                    <Slider value={ sliderValue } onValueChange={ setSliderValue } max={ Number(filter.values[filter.values.length - 1]) } step={ 10 } />
                    { filter.title === "Workout Duration" && `${sliderValue} Mins` }
                </div>
            )
            :
            (
                <>
                    <ComboBox options={ filter.values } title={ filter.title } />
                </>
            )
            }
        </div>
    );
};

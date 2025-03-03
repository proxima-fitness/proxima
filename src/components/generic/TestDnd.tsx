"use client";

import { rectSortingStrategy } from "@dnd-kit/sortable";

import { MultipleContainers } from "./MultipleContainers";

export const TestDnd: React.FC = () => {

    return (
            <MultipleContainers
                itemCount={5}
                strategy={rectSortingStrategy}
                vertical
            />
    )
}

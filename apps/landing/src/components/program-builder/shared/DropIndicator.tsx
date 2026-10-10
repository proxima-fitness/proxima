// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module DropIndicator
 * Invisible drag-and-drop target strip; data attributes drive where a dropped item is inserted (beforeId, column).
 * Depends on: none. Used by: program builder week/day drag-drop containers.
 */
interface IProps {
    /** Id of the item after which to insert (or null for prepend); used by drop handler. */
    beforeId: string | null;
    /** Week column identifier for the drop zone. */
    weekOrder: string;
}

/** Renders a thin strip with data-before and data-column for DnD logic; opacity-0 so layout-only. */
export const DropIndicator: React.FC<IProps> = (props) => {

    const {
        beforeId,
        weekOrder,
    } = props;

    return (
        <div
            data-before={ beforeId || "-1" }
            data-column={ weekOrder }
            className="my-0.5 h-1 w-full rounded-2xl bg-lightSecondary dark:bg-white opacity-0"
        />
    );
};


export const DropIndicator = ({ beforeId, weekOrder }) => {
    return (
        <div
            data-before={beforeId || "-1"}
            data-column={weekOrder}
            className="my-0.5 h-0.5 w-full bg-secondary opacity-0"
        />
    );
};

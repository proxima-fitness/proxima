
interface IProps {
    beforeId: string | null;
    weekOrder: string;
}

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

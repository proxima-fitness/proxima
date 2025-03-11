
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
            className="my-0.5 h-0.5 w-full bg-secondary opacity-0"
        />
    );
};

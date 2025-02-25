import { DayCard } from "./DayCard";
import { WeeksBar } from "./WeeksBar";


export const ProximaProgram: React.FC = () => {

    const days = [1,2,3,4,5,6];

    return (
        <>
            <WeeksBar weeks={ 12 } />
            <div className="flex flex-col gap-4">
                { days.map((day) => (
                    <DayCard key={ day } day={ day }/>
                ))}
            </div>
        </>
    );
};

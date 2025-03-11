import { usePrograms } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramSearch } from "./ProgramSearch";

export const Programs: React.FC = () => {

    const { data: programs, isLoading: loadingPrograms, isError: errorFetchingPrograms } = usePrograms();

    if (loadingPrograms) {
        return (
            <div className="pt-10 h-[500px]">
                <Skeleton className="h-[300px] p-4 bg-gray-100">
                    <h1 className="text-center text-3xl pb-4 font-main"></h1>
                    <div className="max-sm:w-full flex flex-col items-center justify-center">
                        <div className="w-full flex flex-row max-sm:flex-col items-center justify-center">
                            <div className="flex-1"></div>
                            <div className="w-[60%] max-sm:w-full">
                            </div>
                        </div>
                        <div className="grid grid-cols-3 max-sm:grid-cols-1">
                        </div>
                    </div>
                </Skeleton>
            </div>
        );
    }

    return (
        <>
            { programs !== undefined &&
                <ProgramSearch programs={ programs } />
            }
            { errorFetchingPrograms &&
                <div className="h-96 w-full text-center">An error occured fetching programs</div>
            }
        </>
    );
};

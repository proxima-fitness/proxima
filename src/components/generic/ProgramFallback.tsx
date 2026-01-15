import { Skeleton } from "../ui/skeleton"


export const ProgramFallback: React.FC = () => {

    return (
        <>
        <div className="grid grid-cols-3 max-sm:grid-cols-1 grid-rows-[350px_auto_auto] max-sm:grid-rows-none gap-x-12 max-sm:gap-x-0 gap-y-6 md:gap-y-8 pb-8 w-full">
                <div className="col-span-2 row-start-1 max-sm:col-span-1">
            <Skeleton className="rounded-lg object-cover h-[350px] w-full">
            </Skeleton>
        </div>
                <div className="col-span-2 row-start-2 max-sm:col-span-1">
                    <Skeleton className="w-full h-[100px]"></Skeleton>
                </div>
            <div className="col-span-2 row-start-3 max-sm:col-span-1">
                <Skeleton className="w-full h-[450px]"></Skeleton>
            </div>
                <div className="row-span-2 row-start-1 max-sm:row-span-1 max-sm:row-start-auto flex items-start h-full">
                    <div className="rounded-xl w-full h-[500px] flex flex-col text-center justify-center items-center">
                        <Skeleton className="w-full h-[500px] rounded-xl"></Skeleton>
                    </div>
                </div>
                <div className="row-start-3 max-sm:row-start-auto h-full">
                    <div className="rounded-xl w-full h-full flex flex-col text-center justify-center items-center">
                        <Skeleton className="w-full h-full rounded-xl"></Skeleton>
                    </div>
                </div>
            </div>
            <div className="w-full">
            <div className="flex flex-row max-sm:flex-col w-full overflow-scroll max-sm:p-0 p-2 gap-4">
                { [1,2,3,4,5,6,7,8,9,10,11,12].map((_, index) => (
                    <div className="w-full" key={ `Week ${index}` }>
                        <span className="p-2 font-main"><Skeleton className="w-full h-8"></Skeleton></span>
                            <div className="px-4 py-4 my-4 min-w-[400px] max-w-[400px] w-[400px] max-sm:min-w-[99%] max-sm:max-w-[99%] max-sm:w-[99%]" key={ "week " + index + " " }>
                                <div className="flex flex-row justify-center items-center w-full">
                                    <Skeleton className="w-full h-8"></Skeleton>
                                </div>
                                <div
                                    className="my-4 rounded-xl"
                                >
                                    { [1,2,3,4,5,6].map((_, exerciseIndex: number) => (
                                        <div key={ exerciseIndex }>
                                            <div className="border-b-2 text-sm border-gray-200 flex flex-row justify-between font-light items-center py-2">
                                                <div className="flex flex-row gap-4">
                                                    <div className="font-third font-normal text-sm"><Skeleton className="w-full h-4"></Skeleton></div>
                                                </div>
                                                <div className="text-center flex flex-row justify-end items-center w-full text-sm">
                                                    <div className="w-full flex flex-col justify-center items-center">
                                                        <Skeleton className="w-full h-8"></Skeleton>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) ) }
                                </div>
                            </div>
                    </div>
                ) ) }
            </div>
        </div>
        </>
    );
};

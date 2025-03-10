"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsHevy } from "@/contexts/HevyContext";

export const ProgramBuilderTabs: React.FC = () => {

    const { setIsHevy } = useIsHevy();

    return (
        <Tabs defaultValue="hevy" className="w-[33%] flex items-center justify-center">
            <TabsList>
                <TabsTrigger onClick={ () => setIsHevy(true) } value="hevy">Hevy Routine</TabsTrigger>
                <TabsTrigger onClick={ () => setIsHevy(false) } value="proxima">Proxima Program</TabsTrigger>
            </TabsList>
        </Tabs>
    );
};

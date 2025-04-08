"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsHevy } from "@/contexts/HevyContext";

export const ProgramBuilderTabs: React.FC = () => {

    const { isHevy, setIsHevy } = useIsHevy();

    return (
        <Tabs value={ isHevy ? "hevy" : "proxima" } className="max-sm:hidden w-[33%] flex items-center justify-center">
            <TabsList>
                <TabsTrigger onClick={ () => setIsHevy(true) } value="hevy">Hevy Routines</TabsTrigger>
                <TabsTrigger onClick={ () => setIsHevy(false) } value="proxima">Proxima Program</TabsTrigger>
            </TabsList>
        </Tabs>
    );
};

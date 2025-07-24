 
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MenuIcon } from "lucide-react";

export function CustomTrigger() {

    const { toggleSidebar } = useSidebar();

    return (
        <Button className="bg-white dark:bg-black focus:bg-white hover:bg-white dark:focus:bg-black" onClick={ toggleSidebar }>
            <MenuIcon className="w-[28px] h-[28px] object-contain" />
        </Button>
    );
};

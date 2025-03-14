/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { menu } from "public";

export function CustomTrigger() {

    const { toggleSidebar } = useSidebar();

    return (
        <Button onClick={ toggleSidebar }>
            <img
                src={ (menu as any).src }
                alt="menu"
                className="w-[28px] h-[28px] object-contain"
            />
        </Button>
    );
};

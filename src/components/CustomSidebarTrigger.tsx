/**
 * @module CustomSidebarTrigger
 * Button that toggles the app sidebar open/closed; used in header/nav for mobile or compact layout.
 * Depends on: UI sidebar (useSidebar), Button, lucide MenuIcon.
 * Used by: header/layout that shows sidebar toggle.
 */
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MenuIcon } from "lucide-react";

/** No props. Renders a ghost button that toggles the sidebar. */
export function CustomTrigger() {

    const { toggleSidebar } = useSidebar();

    return (
        <Button variant="ghost" className="bg-white dark:bg-darkGray focus:bg-white hover:bg-white dark:focus:bg-black" onClick={ toggleSidebar } aria-label="Toggle sidebar">
            <MenuIcon className="w-[28px] h-[28px] object-contain" />
        </Button>
    );
};

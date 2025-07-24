"use client";

import { Home, LogIn, PersonStanding, Search } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "About us",
    url: "/about",
    icon: PersonStanding,
  },
  {
    title: "Search Programs",
    url: "/programs",
    icon: Search,
  },
//   {
//     title: "AI Program Builder",
//     url: "/program-builder",
//     icon: TerminalSquare,
//   },
  {
    title: "Log in",
    url: "/auth/login",
    icon: LogIn,
  },
//   {
//     title: "Download App",
//     url: "/download",
//     icon: HardDriveDownload,
//   },
];

export function AppSidebar() {

    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Proxima Fitness Inc. &middot; Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            { items.map((item) => (
                                <SidebarMenuItem key={ item.title }>
                                    <SidebarMenuButton asChild>
                                        <a href={ item.url }>
                                            <item.icon className="font-main" />
                                            <span className="font-main">{ item.title }</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ) ) }
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};

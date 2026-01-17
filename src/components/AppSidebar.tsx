"use client";

import { Home, LogIn, LogOut, PersonStanding, Search, Archive } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useUserContext } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserFullName } from "@/api/hooks";
import { signOutUser } from "@/api/authentication";

// Client-side function to call the server-side sign out API
const signOutServer = async () => {
    try {
        const response = await fetch('/api/auth/signout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Failed to sign out on server');
        }
    } catch (error) {
        console.error('Error calling sign out API:', error);
    }
};

// Base menu items (always shown)
const baseItems = [
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
];

export function AppSidebar() {
    const { user, isLoading } = useUserContext();
    const { data: userFullName } = useUserFullName(user?.id, "user");

    const handleLogout = async () => {
        await signOutUser();
        await signOutServer();
    };

    // Menu items that depend on authentication state
    const authenticatedItems = user ? [
        {
            title: "My Programs",
            url: "/my-programs",
            icon: Archive,
        },
        {
            title: "Explore",
            url: "/programs",
            icon: Search,
        },
    ] : [
        {
            title: "Explore",
            url: "/programs",
            icon: Search,
        },
    ];

    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Proxima Fitness Inc. &middot; Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            { baseItems.map((item) => (
                                <SidebarMenuItem key={ item.title }>
                                    <SidebarMenuButton asChild>
                                        <a href={ item.url }>
                                            <item.icon className="font-main" />
                                            <span className="font-main">{ item.title }</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ) ) }
                            { authenticatedItems.map((item) => (
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
                {!isLoading && (
                    <>
                        <SidebarSeparator />
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {user ? (
                                        <>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                                                        <AvatarFallback>
                                                            {userFullName?.charAt(0) || "U"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-main">
                                                        {userFullName || "User"}
                                                    </span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton onClick={handleLogout} className="text-red-500 hover:text-red-600">
                                                    <LogOut className="font-main" />
                                                    <span className="font-main">Log out</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </>
                                    ) : (
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild>
                                                <a href="/auth/login">
                                                    <LogIn className="font-main" />
                                                    <span className="font-main">Log in</span>
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </>
                )}
            </SidebarContent>
        </Sidebar>
    );
};

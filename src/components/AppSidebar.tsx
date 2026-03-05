"use client";

/**
 * @module AppSidebar
 * Main app sidebar: nav links (Home, About, Dashboard, Explore), units (lbs/kg), pricing/upgrade,
 * user avatar, logout, and test-user tier toggle. Uses signOutUser + server signout API.
 * Depends on: UI Sidebar, UserContext, feature limits, authentication API, TestUserTierToggle.
 * Used by: app layout (sidebar slot).
 */
import { Home, LogIn, LogOut, PersonStanding, Search, Receipt, Crown, UserRound, Trash2 } from "lucide-react";
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
import { useProfilePictureContext } from "@/contexts/ProfilePictureContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyFeatureLimits, useUserFullName } from "@/api/hooks";
import { signOutUser } from "@/api/authentication";
import { TestUserTierToggle } from "@/components/TestUserTierToggle";
import { isTestUser } from "@/api/featureLimits";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { getInitials } from "@/utils/general/helpers";
import { useMemo, useState } from "react";
import { DeleteAccountDialog } from "@/components/header/DeleteAccountDialog";

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

/** No props. Renders full sidebar with nav, units, auth and test-tier controls. */
export function AppSidebar() {
    const { user, isLoading } = useUserContext();
    const { profilePicture } = useProfilePictureContext();
    const { isInLbs, toggleModePreference } = usePoundsOrKgContext();
    const { data: userFullName } = useUserFullName(user?.id ? user.id : undefined, "user");
    const { data: featureLimits } = useMyFeatureLimits(user);
    const isPro = featureLimits?.has_active_subscription === true;
    const stripePortalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL?.trim() || "";
    const avatarSrc = useMemo(() => (profilePicture ? URL.createObjectURL(profilePicture) : null), [profilePicture]);
    const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);

    const handleLogout = async () => {
        await signOutUser();
        await signOutServer();
    };

    // Menu items that depend on authentication state
    const authenticatedItems = user ? [

        {
            title: "Explore",
            url: "/programs",
            icon: Search,
        },
        {
            title: "Profile",
            url: "/profile",
            icon: UserRound,
        }
    ] : [
        {
            title: "Explore",
            url: "/programs",
            icon: Search,
        },
    ];

    return (
        <>
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
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sidebar-foreground/70">Units</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isInLbs}
                                    onClick={() => { if (!isInLbs) toggleModePreference(); }}
                                    className="font-main"
                                >
                                    <span className="font-main">Pounds (lbs)</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={!isInLbs}
                                    onClick={() => { if (isInLbs) toggleModePreference(); }}
                                    className="font-main"
                                >
                                    <span className="font-main">Kilograms (kg)</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {!isLoading && (
                    <>
                        <SidebarSeparator />
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {!(user && isPro) && (
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild>
                                                <a href="/pricing">
                                                    <Crown className="font-main" />
                                                    <span className="font-main">{user ? "Upgrade" : "Pricing"}</span>
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )}
                                    {user && isPro && stripePortalUrl && (
                                        <>
                                            <SidebarMenuItem>
                                                <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70">
                                                    <Crown className="size-4 shrink-0" />
                                                    Pro account
                                                </div>
                                            </SidebarMenuItem>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton asChild>
                                                    <a href={stripePortalUrl}>
                                                        <Receipt className="font-main" />
                                                        <span className="font-main">Manage Subscription</span>
                                                    </a>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </>
                                    )}
                                    {user ? (
                                        <>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={avatarSrc ?? user?.user_metadata?.avatar_url ?? undefined} alt={userFullName ? `${userFullName} avatar` : "User avatar"} />
                                                        <AvatarFallback>
                                                            {getInitials(userFullName ?? "") ?? userFullName?.charAt(0) ?? "U"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-main">
                                                        {userFullName || "User"}
                                                    </span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton onClick={() => setOpenDeleteAccountDialog(true)} className="text-destructive hover:text-destructive/90">
                                                    <Trash2 className="font-main" />
                                                    <span className="font-main">Delete my account</span>
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
                        {user && isTestUser(user) && (
                            <>
                                <SidebarSeparator />
                                <SidebarGroup>
                                    <SidebarGroupContent>
                                        <TestUserTierToggle />
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            </>
                        )}
                    </>
                )}
            </SidebarContent>
        </Sidebar>
        <DeleteAccountDialog open={openDeleteAccountDialog} onOpenChange={setOpenDeleteAccountDialog} />
    </>
    );
};

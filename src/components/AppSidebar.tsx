/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * @module AppSidebar
 * Main app sidebar: collapsible icon/full layout on desktop, sheet on mobile.
 * Nav links, units, theme, Connect Hevy, pricing/upgrade, user avatar, logout,
 * and test-user tier toggle.
 * Depends on: UI Sidebar, UserContext, feature limits, authentication API, TestUserTierToggle.
 * Used by: app layout (sidebar slot).
 */
import {
    Home,
    LogIn,
    LogOut,
    PersonStanding,
    Search,
    Receipt,
    Crown,
    UserRound,
    Trash2,
    LockIcon,
    Link2,
    Sun,
    Moon,
    Monitor,
    PanelLeft,
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    useSidebar,
} from "@/components/ui/sidebar";
import { useUserContext } from "@/contexts/UserContext";
import { useProfilePictureContext } from "@/contexts/ProfilePictureContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyFeatureLimits, useUserFullName, useProfilePictureByID, useHevySecret } from "@/api/hooks";
import { signOutUser } from "@/api/authentication";
import { TestUserTierToggle } from "@/components/TestUserTierToggle";
import { isTestUser } from "@/api/featureLimits";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { getInitials } from "@/utils/general/helpers";
import { useMemo, useState } from "react";
import { DeleteAccountDialog } from "@/components/header/DeleteAccountDialog";
import { ConnectHevyDialog } from "@/components/header/ConnectHevyDialog";
import { useTheme } from "next-themes";
import { proxima_logo, proxima_logo_white_full_text } from "public";

const signOutServer = async () => {
    try {
        const response = await fetch("/api/auth/signout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) console.error("Failed to sign out on server");
    } catch (error) {
        console.error("Error calling sign out API:", error);
    }
};

const baseItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "About us", url: "/about", icon: PersonStanding },
];

export function AppSidebar() {
    const { user, isLoading } = useUserContext();
    const { profilePicture } = useProfilePictureContext();
    const { isInLbs, toggleModePreference } = usePoundsOrKgContext();
    const { theme, setTheme } = useTheme();
    const { data: userFullName } = useUserFullName(user?.id ? user.id : undefined, "user");
    const { data: featureLimits } = useMyFeatureLimits(user);
    const { data: profilePicBlob } = useProfilePictureByID(user?.id ?? "");
    const { data: hevyApiKey } = useHevySecret(user);
    const isPro = featureLimits?.has_active_subscription === true;
    const stripePortalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL?.trim() || "";
    const effectiveProfilePic = profilePicture ?? profilePicBlob ?? null;
    const avatarSrc = useMemo(
        () => (effectiveProfilePic ? URL.createObjectURL(effectiveProfilePic) : null),
        [effectiveProfilePic],
    );
    const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);
    const [openConnectHevyDialog, setOpenConnectHevyDialog] = useState(false);

    const { toggleSidebar, state } = useSidebar();

    const handleLogout = async () => {
        await signOutUser();
        await signOutServer();
    };

    const authenticatedItems = user
        ? [
              { title: "Explore", url: "/programs", icon: Search },
              { title: "Profile", url: "/profile", icon: UserRound },
          ]
        : [{ title: "Explore", url: "/programs", icon: Search }];

    return (
        <>
            <Sidebar collapsible="icon">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={toggleSidebar}
                                tooltip="Toggle sidebar"
                            >
                                <PanelLeft className="shrink-0" />
                                <img src={(proxima_logo as { src: string }).src} alt="Proxima Logo" className="h-8 w-auto shrink-0 dark:block hidden" />
                                <img src={(proxima_logo_white_full_text as { src: string }).src} alt="Proxima Logo" className="h-8 w-auto shrink-0 dark:hidden block" />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {baseItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild tooltip={item.title}>
                                            <a href={item.url}>
                                                <item.icon className="shrink-0" />
                                                <span className="font-main">{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                                {authenticatedItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild tooltip={item.title}>
                                            <a href={item.url}>
                                                <item.icon className="shrink-0" />
                                                <span className="font-main">{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarSeparator />

                    {/* Theme */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Theme</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={theme === "light"}
                                        onClick={() => setTheme("light")}
                                        tooltip="Light theme"
                                    >
                                        <Sun className="shrink-0" />
                                        <span className="font-main">Light</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={theme === "dark"}
                                        onClick={() => setTheme("dark")}
                                        tooltip="Dark theme"
                                    >
                                        <Moon className="shrink-0" />
                                        <span className="font-main">Dark</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={theme === "system"}
                                        onClick={() => setTheme("system")}
                                        tooltip="System theme"
                                    >
                                        <Monitor className="shrink-0" />
                                        <span className="font-main">System</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Units */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Units</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isInLbs}
                                        onClick={() => { if (!isInLbs) toggleModePreference(); }}
                                        tooltip="Pounds (lbs)"
                                    >
                                        lbs
                                        <span className="font-main">Pounds (lbs)</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={!isInLbs}
                                        onClick={() => { if (isInLbs) toggleModePreference(); }}
                                        tooltip="Kilograms (kg)"
                                    >
                                        kg
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
                                                <SidebarMenuButton asChild tooltip={user ? "Upgrade" : "Pricing"}>
                                                    <a href="/pricing">
                                                        <Crown className="shrink-0" />
                                                        <span className="font-main">
                                                            {user ? "Upgrade" : "Pricing"}
                                                        </span>
                                                    </a>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}
                                        {user && isPro && stripePortalUrl && (
                                            <>
                                                <SidebarMenuItem>
                                                    <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70">
                                                        <Crown className="size-4 shrink-0" />
                                                        <span className="group-data-[collapsible=icon]:hidden">
                                                            Pro account
                                                        </span>
                                                    </div>
                                                </SidebarMenuItem>
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton asChild tooltip="Manage Subscription">
                                                        <a href={stripePortalUrl}>
                                                            <Receipt className="shrink-0" />
                                                            <span className="font-main">
                                                                Manage Subscription
                                                            </span>
                                                        </a>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            </>
                                        )}
                                        {user && (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    onClick={() => setOpenConnectHevyDialog(true)}
                                                    tooltip={
                                                        hevyApiKey && hevyApiKey.length > 0
                                                            ? "Connected to Hevy"
                                                            : "Connect Hevy App"
                                                    }
                                                >
                                                    {hevyApiKey && hevyApiKey.length > 0 ? (
                                                        <>
                                                            <LockIcon className="shrink-0 text-green-500" />
                                                            <span className="font-main text-green-500">
                                                                Connected to Hevy
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Link2 className="shrink-0" />
                                                            <span className="font-main">
                                                                Connect Hevy App
                                                            </span>
                                                        </>
                                                    )}
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}
                                        {user ? (
                                            <>
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        onClick={() => setOpenDeleteAccountDialog(true)}
                                                        className="text-destructive hover:text-destructive/90"
                                                        tooltip="Delete my account"
                                                    >
                                                        <Trash2 className="shrink-0" />
                                                        <span className="font-main">
                                                            Delete my account
                                                        </span>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        onClick={handleLogout}
                                                        className="text-red-500 hover:text-red-600"
                                                        tooltip="Log out"
                                                    >
                                                        <LogOut className="shrink-0" />
                                                        <span className="font-main">Log out</span>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            </>
                                        ) : (
                                            <SidebarMenuItem>
                                                <SidebarMenuButton asChild tooltip="Log in">
                                                    <a href="/auth/login">
                                                        <LogIn className="shrink-0" />
                                                        <span className="font-main">Log in</span>
                                                    </a>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                            {user && isTestUser(user) && state !== "collapsed" && (
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

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {user ? (
                                <SidebarMenuButton asChild tooltip={userFullName || "Profile"}>
                                    <a href="/profile" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                                        <Avatar className="h-6 w-6 shrink-0">
                                            <AvatarImage
                                                src={avatarSrc ?? user?.user_metadata?.avatar_url ?? undefined}
                                                alt={userFullName ? `${userFullName} avatar` : "User avatar"}
                                            />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(userFullName ?? "") ?? userFullName?.charAt(0) ?? "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-main truncate group-data-[collapsible=icon]:hidden">
                                            {userFullName || "User"}
                                        </span>
                                    </a>
                                </SidebarMenuButton>
                            ) : (
                                <SidebarMenuButton asChild tooltip="Log in">
                                    <a href="/auth/login" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                                        <Avatar className="h-6 w-6 shrink-0">
                                            <AvatarFallback className="text-xs">?</AvatarFallback>
                                        </Avatar>
                                        <span className="font-main group-data-[collapsible=icon]:hidden">Log in</span>
                                    </a>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <DeleteAccountDialog open={openDeleteAccountDialog} onOpenChange={setOpenDeleteAccountDialog} />
            <ConnectHevyDialog
                openConnectHevyDialog={openConnectHevyDialog}
                handleOpenConnectHevyDialog={setOpenConnectHevyDialog}
            />
        </>
    );
}

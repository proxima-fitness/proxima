/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * @module AppSidebar
 * Main app sidebar: collapsible icon/full layout on desktop, sheet on mobile.
 * Nav links, footer avatar (opens settings: theme, units, subscription, Connect Hevy,
 * delete account, log out), and test-user tier toggle.
 * Depends on: UI Sidebar, UserContext, feature limits, authentication API, TestUserTierToggle.
 * Used by: app layout (sidebar slot).
 */
import {
    Home,
    LogOut,
    // MessageSquarePlus,
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
    LogIn,
    Info,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserContext } from "@/contexts/UserContext";
import { useProfilePictureContext } from "@/contexts/ProfilePictureContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyFeatureLimits, useUserFullName, useProfilePictureByID, useHevySecret } from "@/api/hooks";
import { signOutUser } from "@/api/authentication";
import { TestUserTierToggle } from "@/components/TestUserTierToggle";
import { isTestUser } from "@/api/feature-limits";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { getInitials } from "@/utils/general/helpers";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { DeleteAccountDialog } from "@/components/header/DeleteAccountDialog";
import { ConnectHevyDialog } from "@/components/header/ConnectHevyDialog";
import { useTheme } from "next-themes";
import { proxima_logo, proxima_logo_white_full_text } from "public";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewChatConfirmDialog } from "@/components/NewChatConfirmDialog";
import { authenticatedNavLinks, navLinks, navIdToUrl } from "@/assets/constants/nav-links";

const CHAT_MESSAGES_KEY = "messages";
const HEVY_PROGRAM_IN_PROGRESS_KEY = "hevy-program-in-progress";

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

// const RECENTS_LIMIT = 10;
const navIdToIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    home: Home,
    programs: Search,
    about: Info,
    pricing: Crown,
    profile: UserRound,
    "log-in": LogIn,
};

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
    const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
    const router = useRouter();

    const { toggleSidebar, state, isMobile, openMobile, setOpenMobile } = useSidebar();
    const closeMobileSidebar = useCallback(() => {
        if (isMobile) setOpenMobile(false);
    }, [isMobile, setOpenMobile]);
    // const { data: chatIds, isLoading: chatIdsLoading, isError: chatIdsError } = useChatIds(user);
    // const recentChats = (chatIds ?? []).slice(0, RECENTS_LIMIT);
    // const pathname = usePathname();
    // const searchParams = useSearchParams();
    // const selectedChatId =
    //     pathname?.startsWith("/build-program") === true ? searchParams.get("chat") : null;

    const handleLogout = async () => {
        await signOutUser();
        await signOutServer();
    };

    // const handleNewChatClick = () => {
    //     if (user) return; // Logged in: do nothing
    //     const hasProgress =
    //         typeof window !== "undefined" &&
    //         (!!localStorage.getItem(CHAT_MESSAGES_KEY) ||
    //             !!localStorage.getItem(HEVY_PROGRAM_IN_PROGRESS_KEY));
    //     if (hasProgress) {
    //         setShowNewChatConfirm(true);
    //     } else {
    //         router.push("/build-program");
    //     }
    // };

    const handleNewChatContinue = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(CHAT_MESSAGES_KEY);
            localStorage.removeItem(HEVY_PROGRAM_IN_PROGRESS_KEY);
        }
        router.push("/build-program?new=true");
    };

    const sidebarNavLinks = user ? authenticatedNavLinks : navLinks;
    const sidebarItemsToShow = sidebarNavLinks.filter(
        (nav) => !(nav.id === "pricing" && isPro) && !(nav.id === "log-in" && user),
    );

    const shouldShowTestUserToggle =
        !isLoading &&
        user &&
        isTestUser(user) &&
        ((!isMobile && state !== "collapsed") || (isMobile && openMobile));

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
                    {/* <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        tooltip="New Chat"
                                        onClick={handleNewChatClick}
                                    >
                                        <MessageSquarePlus className="shrink-0" />
                                        <span className="font-main">New Chat</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup> */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigate</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {sidebarItemsToShow.map((nav) => {
                                    const Icon = navIdToIcon[nav.id];
                                    const url = navIdToUrl[nav.id] ?? `/${nav.id}`;
                                    const isPricing = nav.id === "pricing";
                                    return (
                                        <SidebarMenuItem key={nav.id}>
                                            <SidebarMenuButton asChild tooltip={nav.title}>
                                                <Link href={url} onClick={closeMobileSidebar}>
                                                    {Icon && (
                                                        <Icon
                                                            className={cn("shrink-0", isPricing && "text-lightGold")}
                                                        />
                                                    )}
                                                    <span className={cn("font-main", isPricing && "dark:text-lightGold")}>
                                                        {nav.title}
                                                    </span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* <SidebarGroup>
                        <SidebarGroupLabel>Recents</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {!user ? (
                                    <SidebarMenuItem>
                                        <span className="px-2 py-1.5 text-sm text-muted-foreground font-main group-data-[collapsible=icon]:hidden">
                                            No recent chats
                                        </span>
                                    </SidebarMenuItem>
                                ) : chatIdsLoading ? (
                                    <SidebarMenuItem>
                                        <span className="px-2 py-1.5 text-sm text-muted-foreground font-main group-data-[collapsible=icon]:hidden">
                                            Loading…
                                        </span>
                                    </SidebarMenuItem>
                                ) : chatIdsError ? (
                                    <SidebarMenuItem>
                                        <span className="px-2 py-1.5 text-sm text-muted-foreground font-main group-data-[collapsible=icon]:hidden">
                                            Couldn&apos;t load chats
                                        </span>
                                    </SidebarMenuItem>
                                ) : recentChats.length === 0 ? (
                                    <SidebarMenuItem>
                                        <span className="px-2 py-1.5 text-sm text-muted-foreground font-main group-data-[collapsible=icon]:hidden">
                                            No recent chats
                                        </span>
                                    </SidebarMenuItem>
                                ) : state === "collapsed" ? (
                                    null
                                ) : (
                                    recentChats.map((chat) => {
                                        const displayTitle = chat.title?.trim() || "Untitled chat";
                                        const href = `/build-program?chat=${encodeURIComponent(chat.id)}&edit=true${
                                            chat.program_id
                                                ? `&shareId=${encodeURIComponent(chat.program_id)}&shared=true`
                                                : ""
                                        }`;
                                        const isActive = chat.id === selectedChatId;
                                        return (
                                            <SidebarMenuItem key={chat.id}>
                                                <SidebarMenuButton
                                                    asChild
                                                    tooltip={displayTitle}
                                                    className={cn(
                                                        isActive && "bg-accent text-accent-foreground"
                                                    )}
                                                >
                                                    <Link
                                                        href={href}
                                                        className="flex min-w-0 flex-1 items-center gap-2"
                                                        onClick={closeMobileSidebar}
                                                    >
                                                        <span className="min-w-0 flex-1 truncate font-main">
                                                            {displayTitle}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup> */}

                    {shouldShowTestUserToggle && (
                        <>
                            <SidebarSeparator />
                            <SidebarGroup>
                                <SidebarGroupContent>
                                    <TestUserTierToggle />
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </>
                    )}
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip="Settings"
                                            className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
                                        >
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
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                    side="top"
                                    align="end"
                                    className={cn(
                                        "min-w-48",
                                        isMobile && openMobile && "w-[18rem]",
                                        !isMobile && state === "expanded" && "w-[16rem]",
                                    )}
                                >
                                        <DropdownMenuLabel className="font-normal">
                                            {userFullName || "User"}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/profile" className="cursor-pointer flex items-center gap-2" onClick={closeMobileSidebar}>
                                                <UserRound className="h-4 w-4" />
                                                Profile
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                            Theme
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTheme("light");
                                            }}
                                            className={`cursor-pointer ${theme === "light" ? "bg-accent" : ""}`}
                                        >
                                            <Sun className="h-4 w-4 mr-2" />
                                            Light
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTheme("dark");
                                            }}
                                            className={`cursor-pointer ${theme === "dark" ? "bg-accent" : ""}`}
                                        >
                                            <Moon className="h-4 w-4 mr-2" />
                                            Dark
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTheme("system");
                                            }}
                                            className={`cursor-pointer ${theme === "system" ? "bg-accent" : ""}`}
                                        >
                                            <Monitor className="h-4 w-4 mr-2" />
                                            System
                                        </DropdownMenuItem>
                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                            Units
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                if (!isInLbs) toggleModePreference();
                                            }}
                                            className={`cursor-pointer ${isInLbs ? "bg-accent" : ""}`}
                                        >
                                            Pounds (lbs)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                if (isInLbs) toggleModePreference();
                                            }}
                                            className={`cursor-pointer ${!isInLbs ? "bg-accent" : ""}`}
                                        >
                                            Kilograms (kg)
                                        </DropdownMenuItem>
                                        {user && isPro && stripePortalUrl && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                                                    <Crown className="h-4 w-4" />
                                                    Pro account
                                                </DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <a
                                                        href={stripePortalUrl}
                                                        className="cursor-pointer flex items-center gap-2"
                                                    >
                                                        <Receipt className="h-4 w-4" />
                                                        Manage Subscription
                                                    </a>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setOpenConnectHevyDialog(true);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            {hevyApiKey && hevyApiKey.length > 0 ? (
                                                <span className="flex items-center gap-2 text-green-600 dark:text-green-500">
                                                    <LockIcon className="h-4 w-4" />
                                                    Connected to Hevy
                                                </span>
                                            ) : (
                                                <>
                                                    <Link2 className="h-4 w-4 mr-2" />
                                                    Connect Hevy App
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setOpenDeleteAccountDialog(true);
                                            }}
                                            className="cursor-pointer text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete account
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                void handleLogout();
                                            }}
                                            className="cursor-pointer bg-red-500/10 text-red-600 hover:bg-red-500/20 focus:bg-red-500/20 dark:text-red-400"
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Log out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <SidebarMenuButton asChild tooltip="Log in">
                                    <Link
                                        href="/auth/login"
                                        className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
                                        onClick={closeMobileSidebar}
                                    >
                                        <Avatar className="h-6 w-6 shrink-0">
                                            <AvatarFallback className="text-xs">
                                                <LogIn className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-main group-data-[collapsible=icon]:hidden">Log in</span>
                                    </Link>
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
            <NewChatConfirmDialog
                open={showNewChatConfirm}
                onOpenChange={setShowNewChatConfirm}
                onContinue={handleNewChatContinue}
            />
        </>
    );
}

// SPDX-License-Identifier: AGPL-3.0-only

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
    Search,
    Receipt,
    Crown,
    UserRound,
    Trash2,
    Settings,
    LockIcon,
    Link2,
    Sun,
    Moon,
    Monitor,
    PanelLeft,
    LogIn,
    Info,
    Plus,
    Code2,
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
import { useMyFeatureLimits, useUserFullName, useProfilePictureByID, useHevySecret, useChatIds } from "@/api/hooks";
import { signOutUser } from "@/api/authentication";
import { TestUserTierToggle } from "@/components/TestUserTierToggle";
import { TestUserDebugModeToggle } from "@/components/TestUserDebugModeToggle";
import { isTestUser } from "@/api/feature-limits";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { getInitials } from "@/utils/general/helpers";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DeleteAccountDialog } from "@/components/header/DeleteAccountDialog";
import { ConnectHevyDialog } from "@/components/header/ConnectHevyDialog";
import { useTheme } from "next-themes";
import { proxima_logo, proxima_logo_white_full_text } from "public";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RecentChatMenuItem } from "@/components/sidebar/RecentChatMenuItem";
import { authenticatedNavLinks, navLinks, navIdToUrl } from "@/assets/constants/nav-links";
import { useBuildProgramActions } from "@/contexts/BuildProgramActionsContext";
import { newPathLeaveGuard } from "@/hooks/create-leave-guard";
import { BUILDER_DRAFT_KEY, clearBuilderDraft } from "@/lib/builder-draft";
import { deleteChatHistory, setChatPinned, updateChatTitle } from "@/api/chat-history";
import { buildAuthLoginHref } from "@/lib/sign-in-return";

const CHAT_MESSAGES_KEY = "messages";

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

const RECENTS_LIMIT = 20;
const navIdToIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    home: Home,
    programs: Search,
    developers: Code2,
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
    const [renameDraft, setRenameDraft] = useState<{ chatId: string; title: string } | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [deleteDraft, setDeleteDraft] = useState<TChatListItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { clearChat } = useBuildProgramActions();

    const { toggleSidebar, state, isMobile, openMobile, setOpenMobile, setHoverOpen, pinnedOpen } = useSidebar();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const openDropdownCountRef = useRef(0);

    const handleSidebarMouseEnter = useCallback(() => {
        if (isMobile) return;
        setHoverOpen(true);
    }, [isMobile, setHoverOpen]);

    const handleSidebarMouseLeave = useCallback(() => {
        if (isMobile || openDropdownCountRef.current > 0) return;
        setHoverOpen(false);
    }, [isMobile, setHoverOpen]);

    const handleSidebarDropdownOpenChange = useCallback(
        (open: boolean) => {
            if (open) {
                openDropdownCountRef.current += 1;
                return;
            }

            openDropdownCountRef.current = Math.max(0, openDropdownCountRef.current - 1);
            if (openDropdownCountRef.current === 0 && !pinnedOpen) {
                queueMicrotask(() => {
                    if (openDropdownCountRef.current > 0) return;
                    if (sidebarRef.current?.matches(":hover")) return;
                    setHoverOpen(false);
                });
            }
        },
        [pinnedOpen, setHoverOpen],
    );
    const closeMobileSidebar = useCallback(() => {
        if (isMobile) setOpenMobile(false);
    }, [isMobile, setOpenMobile]);
    const { data: chatIds, isLoading: chatIdsLoading, isError: chatIdsError } = useChatIds(user);
    const pinnedChats = useMemo(
        () => (chatIds ?? []).filter((chat) => chat.pinned),
        [chatIds],
    );
    const recentChats = useMemo(
        () => (chatIds ?? []).filter((chat) => !chat.pinned).slice(0, RECENTS_LIMIT),
        [chatIds],
    );
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const loginHref = buildAuthLoginHref(pathname, searchParams);
    const selectedChatId =
        pathname?.startsWith("/build-program") === true ? searchParams.get("chat") : null;

    const handleLogout = async () => {
        await signOutUser();
        await signOutServer();
        router.push(loginHref);
    };

    const startNewChat = useCallback(() => {
        const href = "/build-program?empty=true";
        const prepareEmptyChat = () => {
            clearBuilderDraft();
            clearChat();
            closeMobileSidebar();
        };
        if (newPathLeaveGuard.requestLeave(href, prepareEmptyChat)) return;
        prepareEmptyChat();
        router.push(href);
    }, [clearChat, closeMobileSidebar, router]);

    const handleNewChatClick = () => {
        if (user) {
            startNewChat();
            return;
        }
        const hasProgress =
            typeof window !== "undefined" &&
            (!!localStorage.getItem(CHAT_MESSAGES_KEY) ||
                !!localStorage.getItem(BUILDER_DRAFT_KEY));
        if (hasProgress) {
            setShowNewChatConfirm(true);
        } else {
            startNewChat();
        }
    };

    const handleNewChatContinue = () => {
        startNewChat();
    };

    const handleRenameChat = useCallback((chat: TChatListItem) => {
        setRenameDraft({
            chatId: chat.id,
            title: chat.title?.trim() || "Untitled chat",
        });
    }, []);

    const handleRenameConfirm = useCallback(async () => {
        if (!user || !renameDraft) return;
        const trimmed = renameDraft.title.trim();
        if (!trimmed) return;

        setIsRenaming(true);
        const result = await updateChatTitle(user, renameDraft.chatId, trimmed);
        setIsRenaming(false);

        if ("success" in result && result.success) {
            void queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
            setRenameDraft(null);
        }
    }, [renameDraft, queryClient, user]);

    const handlePinToggle = useCallback(
        async (chat: TChatListItem, pinned: boolean) => {
            if (!user) return;
            const result = await setChatPinned(user, chat.id, pinned);
            if ("success" in result && result.success) {
                void queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
            }
        },
        [queryClient, user],
    );

    const handleDeleteChat = useCallback((chat: TChatListItem) => {
        setDeleteDraft(chat);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!user || !deleteDraft) return;

        setIsDeleting(true);
        const result = await deleteChatHistory(user, deleteDraft.id);
        setIsDeleting(false);

        if ("success" in result && result.success) {
            void queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
            void queryClient.removeQueries({
                queryKey: ["chat-history", user.id, deleteDraft.id],
            });

            if (deleteDraft.id === selectedChatId) {
                const href = "/build-program?empty=true";
                const leaveBlocked = newPathLeaveGuard.requestLeave(href, () => {
                    clearChat();
                    closeMobileSidebar();
                });
                if (!leaveBlocked) {
                    clearChat();
                    closeMobileSidebar();
                    router.push(href);
                }
            }

            setDeleteDraft(null);
        }
    }, [clearChat, closeMobileSidebar, deleteDraft, queryClient, router, selectedChatId, user]);

    const renderChatList = () => {
        if (!user) {
            return (
                <SidebarMenuItem>
                    <span className="px-2 py-1.5 text-sm text-muted-foreground font-third group-data-[collapsible=icon]:hidden">
                        No recent chats
                    </span>
                </SidebarMenuItem>
            );
        }
        if (chatIdsLoading) {
            return (
                <SidebarMenuItem>
                    <span className="px-2 py-1.5 text-sm text-muted-foreground font-third group-data-[collapsible=icon]:hidden">
                        Loading…
                    </span>
                </SidebarMenuItem>
            );
        }
        if (chatIdsError) {
            return (
                <SidebarMenuItem>
                    <span className="px-2 py-1.5 text-sm text-muted-foreground font-third group-data-[collapsible=icon]:hidden">
                        Couldn&apos;t load chats
                    </span>
                </SidebarMenuItem>
            );
        }
        if (!showRecentChats) {
            return null;
        }
        if (recentChats.length === 0) {
            return (
                <SidebarMenuItem>
                    <span className="px-2 py-1.5 text-sm text-muted-foreground font-third group-data-[collapsible=icon]:hidden">
                        {pinnedChats.length > 0 ? "No other recent chats" : "No recent chats"}
                    </span>
                </SidebarMenuItem>
            );
        }
        return recentChats.map((chat) => (
            <RecentChatMenuItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === selectedChatId}
                onNavigate={closeMobileSidebar}
                onRename={handleRenameChat}
                onPinToggle={handlePinToggle}
                onDelete={handleDeleteChat}
                onDropdownOpenChange={handleSidebarDropdownOpenChange}
            />
        ));
    };

    const sidebarNavLinks = user ? authenticatedNavLinks : navLinks;
    const sidebarItemsToShow = (() => {
        const filtered = sidebarNavLinks.filter(
            (nav) => !(nav.id === "pricing" && isPro) && !(nav.id === "log-in" && user),
        );
        const programsIdx = filtered.findIndex((nav) => nav.id === "programs");
        const developers = { id: "developers", title: "Developers" };
        if (programsIdx < 0) return [...filtered, developers];
        return [
            ...filtered.slice(0, programsIdx + 1),
            developers,
            ...filtered.slice(programsIdx + 1),
        ];
    })();

    const shouldShowTestUserToggle =
        !isLoading &&
        user &&
        isTestUser(user) &&
        ((!isMobile && state !== "collapsed") || (isMobile && openMobile));

    const showRecentChats = isMobile || state !== "collapsed";

    return (
        <>
            <Sidebar
                ref={sidebarRef}
                collapsible="icon"
                onMouseEnter={handleSidebarMouseEnter}
                onMouseLeave={handleSidebarMouseLeave}
            >
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
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        tooltip="New Chat"
                                        onClick={handleNewChatClick}
                                    >
                                        <Plus className="shrink-0" />
                                        <span className="font-third">New Chat</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigate</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {sidebarItemsToShow.map((nav) => {
                                    const Icon = navIdToIcon[nav.id];
                                    const url =
                                        nav.id === "log-in"
                                            ? loginHref
                                            : (navIdToUrl[nav.id] ?? `/${nav.id}`);
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
                                                    <span className={cn("font-third", isPricing && "dark:text-lightGold")}>
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

                    {user && pinnedChats.length > 0 && showRecentChats && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Pinned</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {pinnedChats.map((chat) => (
                                        <RecentChatMenuItem
                                            key={chat.id}
                                            chat={chat}
                                            isActive={chat.id === selectedChatId}
                                            onNavigate={closeMobileSidebar}
                                            onRename={handleRenameChat}
                                            onPinToggle={handlePinToggle}
                                            onDelete={handleDeleteChat}
                                            onDropdownOpenChange={handleSidebarDropdownOpenChange}
                                        />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    <SidebarGroup>
                        <SidebarGroupLabel>Recents</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>{renderChatList()}</SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {shouldShowTestUserToggle && (
                        <>
                            <SidebarSeparator />
                            <SidebarGroup>
                                <SidebarGroupContent>
                                    <TestUserTierToggle />
                                    <TestUserDebugModeToggle />
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </>
                    )}
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {user ? (
                                <DropdownMenu onOpenChange={handleSidebarDropdownOpenChange}>
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
                                            <span className="font-third truncate group-data-[collapsible=icon]:hidden">
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
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/account/privacy"
                                                className="cursor-pointer flex items-center gap-2"
                                                onClick={closeMobileSidebar}
                                            >
                                                <Settings className="h-4 w-4" />
                                                Settings
                                            </Link>
                                        </DropdownMenuItem>
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
                                        href={loginHref}
                                        className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
                                        onClick={closeMobileSidebar}
                                        aria-label="Log in"
                                    >
                                        <Avatar className="h-6 w-6 shrink-0">
                                            <AvatarFallback className="text-xs">
                                                <LogIn className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-third group-data-[collapsible=icon]:hidden">Log in</span>
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
            <ConfirmDialog
                open={showNewChatConfirm}
                onOpenChange={setShowNewChatConfirm}
                title="Start new chat?"
                description="Your current chat and program draft will be deleted. Sign in first to save it."
                confirmLabel="Continue"
                onConfirm={handleNewChatContinue}
            />
            <ConfirmDialog
                open={renameDraft !== null}
                onOpenChange={(open) => {
                    if (!open && !isRenaming) setRenameDraft(null);
                }}
                title="Rename chat"
                confirmLabel="Save"
                confirmLoadingLabel="Saving…"
                confirmVariant="default"
                confirmClassName="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                isConfirmLoading={isRenaming}
                closeOnConfirm={false}
                confirmDisabled={!renameDraft?.title.trim()}
                inputPlaceholder="Untitled chat"
                inputValue={renameDraft?.title ?? ""}
                onInputChange={(title) =>
                    setRenameDraft((prev) => (prev ? { ...prev, title } : prev))
                }
                inputMaxLength={200}
                onConfirm={() => void handleRenameConfirm()}
            />
            <ConfirmDialog
                open={deleteDraft !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) setDeleteDraft(null);
                }}
                title="Delete chat?"
                description="This will permanently delete this chat history. This cannot be undone."
                confirmLabel="Delete"
                confirmLoadingLabel="Deleting…"
                isConfirmLoading={isDeleting}
                closeOnConfirm={false}
                onConfirm={() => void handleDeleteConfirm()}
            />
        </>
    );
}

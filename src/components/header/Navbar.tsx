/* eslint-disable @next/next/no-img-element */
"use client";

/*
 * @module Navbar
 * @description Top-level site navigation bar that coordinates global links, user session controls, theme/units settings, and mobile navigation.
 * @dependsOn User context, feature limit helpers, theme and units contexts, Next.js routing, and shared UI primitives such as dropdown menus and avatars.
 * @usedBy Application and marketing layouts to provide consistent navigation and account entry points across pages.
 */

import { NavDrawer } from "./NavDrawer";
import { BuildProgramToolbarEnd } from "@/components/program-builder/shared/BuildProgramToolbarEnd";
import { proxima_logo, proxima_logo_white_full_text, proxima_logo_black, proxima_logo_white } from "public";
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { buildAuthLoginHref } from '@/lib/sign-in-return';
import { useUserContext } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ConnectHevyDialog } from "./ConnectHevyDialog";
import { useEffect, useState, useMemo, Suspense } from "react";
import { signOutUser } from "@/api/authentication";
import { useHevySecret, useMyFeatureLimits, useUserFullName, useProfilePictureByID } from "@/api/hooks";
import { useProfilePictureContext } from "@/contexts/ProfilePictureContext";
import { getInitials } from "@/utils/general/helpers";
import { useQueryClient } from "@tanstack/react-query";
import {
    getTestTierOverride,
    isTestUser,
    setTestTierOverride,
    type TTestTierOverride,
} from "@/api/feature-limits";
import { Crown, Home, PersonStanding, LockIcon, LogIn, Search, UserRound, Trash2, Shield } from "lucide-react";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { authenticatedNavLinks, navLinks, navIdToUrl } from "@/assets/constants/nav-links";
import { useTheme } from "next-themes"
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
// import { BuyMeCoffee } from "../ui/buy-me-coffee";

const navIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    home: Home,
    programs: Search,
    about: PersonStanding,
    profile: UserRound,
    pricing: Crown,
    "log-in": LogIn,
};

function NavLinkIcon({ navId }: { navId: string }) {
    const Icon = navIcons[navId];
    return Icon ? <Icon className="w-4 h-4 shrink-0" /> : null;
}

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

/**
 * NavItems renders the right-hand navigation content based on route and authentication state.
 */
const NavItems = (pathname: string) => {
    // this should get the user if they logged in server side (via social logins)
    const { user, isLoading } = useUserContext();
    const searchParams = useSearchParams();
    const router = useRouter();
    const loginHref = buildAuthLoginHref(pathname, searchParams);
    const { theme, setTheme } = useTheme();
    const { isInLbs, toggleModePreference } = usePoundsOrKgContext();
    const { data: userFullName } = useUserFullName(user?.id ? user.id : undefined, "user");
    const { data: hevyApiKey } = useHevySecret(user);

    const { data: featureLimits } = useMyFeatureLimits(user);
    const { profilePicture } = useProfilePictureContext();
    const { data: profilePicBlob } = useProfilePictureByID(user?.id ?? "");
    const queryClient = useQueryClient();
    const isPro = featureLimits?.has_active_subscription === true;
    const effectiveProfilePic = profilePicture ?? profilePicBlob ?? null;
    const avatarSrc = useMemo(() => (effectiveProfilePic ? URL.createObjectURL(effectiveProfilePic) : null), [effectiveProfilePic]);
    const stripePortalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL?.trim() || "";
    const navLinksToShow = authenticatedNavLinks.filter(
        (nav) => !(nav.id === "pricing" && isPro)
    );

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [testTierOverride, setTestTierOverrideState] = useState<TTestTierOverride | null>(() => getTestTierOverride());
    const [openConnectHevyDialog, setOpenConnectHevyDialog] = useState(false);
    const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);
    // const { isHevy, setIsHevy } = useIsHevy();

    useEffect(() => {
        if (openConnectHevyDialog) {
          setDropdownOpen(false);
        }
    }, [openConnectHevyDialog]);

    useEffect(() => {
        if (openDeleteAccountDialog) {
          setDropdownOpen(false);
        }
    }, [openDeleteAccountDialog]);

    if (pathname === "/auth/login" || pathname === "/auth/sign-up" || pathname === "/auth/forgot-password") {
        return <></>;
    }

    // Don't render authentication-dependent content while loading
    if (isLoading) {
        return navLinks.map((nav, index) => {
            if (nav.id === "cta") return null;
            if (nav.id === "log-in") {
                return (
                    <li
                        key={nav.id}
                        className={ `font-main font-normal cursor-pointer text-[16px] text-black ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                    >
                        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                    </li>
                );
            }
            return (
                <li
                    key={nav.id}
                    className={ `font-main font-normal cursor-pointer text-[16px] text-black ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                >
                    <Link href={navIdToUrl[nav.id] ?? `/${nav.id}`} className="flex items-center gap-2">
                        <NavLinkIcon navId={nav.id} />
                        {nav.title}
                    </Link>
                </li>
            );
        });
    }

    if (user) {
        return navLinksToShow.map((nav, index) => {
            if (nav.id === "cta") return null;
            if (nav.id === "log-in") {
                return (
                    <li
                        key={nav.id}
                        className={ `font-main font-normal cursor-pointer text-[16px] text-black ${index === navLinksToShow.length - 1 ? "mr-0" : "mr-10"}` }
                    >
                        <DropdownMenu open={dropdownOpen} onOpenChange={(open) => {
                            setDropdownOpen(open);
                            if (open && isTestUser(user)) setTestTierOverrideState(getTestTierOverride());
                        }}>
                            <DropdownMenuTrigger asChild>
                                <div className="cursor-pointer flex flex-row items-center">
                                    <Avatar>
                                        <AvatarImage src={avatarSrc ?? user?.user_metadata?.avatar_url ?? undefined} alt={userFullName ? `${userFullName} avatar` : "User avatar"} />
                                        <AvatarFallback>
                                            {getInitials(userFullName ?? "") ?? userFullName?.charAt(0) ?? "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>
                                    Hi, { userFullName }
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setOpenConnectHevyDialog(true);
                                }} className="cursor-pointer">
                                    { hevyApiKey && hevyApiKey.length > 0 ?
                                        <div className="flex flex-row items-center gap-2 text-green-500">
                                            <LockIcon className="w-4 h-4" />
                                            Connected to Hevy App
                                        </div>
                                    :
                                        "Connect Hevy App"
                                    }
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                                    Workout Format
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        toast.info("Proxima Format selected");
                                        setIsHevy(false);
                                    }}
                                    className={`cursor-pointer focus:text-current ${!isHevy ? 'bg-lightSecondary text-white focus:text-white focus:bg-lightSecondary' : 'bg-white dark:bg-darkGray'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">Proxima Format</span>
                                        <span className="text-xs text-gray-500 text-wrap max-w-[200px]">700+ exercises, rep ranges, rpe ranges, amrap …</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        toast.info("Hevy-Compatible Format selected");
                                        setIsHevy(true);
                                    }}
                                    className={`cursor-pointer focus:text-current ${isHevy ? 'bg-lightSecondary text-white focus:text-white focus:bg-lightSecondary' : 'bg-white dark:bg-darkGray'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">Hevy Format</span>
                                        <span className="text-xs text-gray-500 text-wrap max-w-[200px]">400+ exercises, custom exercises,routines …</span>
                                    </div>
                                </DropdownMenuItem> */}
                                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                                    Theme
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setTheme("light");
                                    }}
                                    className={`cursor-pointer  ${theme === "light" ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">Light</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setTheme("dark");
                                    }}
                                    className={`cursor-pointer ${theme === "dark" ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">Dark</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setTheme("system");
                                    }}
                                    className={`cursor-pointer ${theme === "system" ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">System</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                                    Units
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        if (!isInLbs) toggleModePreference();
                                    }}
                                    className={`cursor-pointer ${isInLbs ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">Pounds (lbs)</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        if (isInLbs) toggleModePreference();
                                    }}
                                    className={`cursor-pointer ${!isInLbs ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">Kilograms (kg)</span>
                                    </div>
                                </DropdownMenuItem>
                                {isPro && stripePortalUrl && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                                            <span className="flex items-center gap-1.5">
                                                <Crown className="w-4 h-4 text-lightGold" />
                                                Pro account
                                            </span>
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <a href={stripePortalUrl} className="cursor-pointer">
                                                Manage Subscription
                                            </a>
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {isTestUser(user) && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                                            Test user
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTestTierOverride(null);
                                                setTestTierOverrideState(null);
                                                queryClient.invalidateQueries({ queryKey: ["feature-limits", user.id] });
                                            }}
                                            className={`cursor-pointer ${testTierOverride === null ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                        >
                                            <span className="font-medium">Real</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTestTierOverride("free");
                                                setTestTierOverrideState("free");
                                                queryClient.invalidateQueries({ queryKey: ["feature-limits", user.id] });
                                            }}
                                            className={`cursor-pointer ${testTierOverride === "free" ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                        >
                                            <span className="font-medium">Free</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTestTierOverride("pro");
                                                setTestTierOverrideState("pro");
                                                queryClient.invalidateQueries({ queryKey: ["feature-limits", user.id] });
                                            }}
                                            className={`cursor-pointer ${testTierOverride === "pro" ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                        >
                                            <span className="font-medium">Pro</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={(e) => {
                                                e.preventDefault();
                                                setTestTierOverride("pro_plus");
                                                setTestTierOverrideState("pro_plus");
                                                queryClient.invalidateQueries({ queryKey: ["feature-limits", user.id] });
                                            }}
                                            className={`cursor-pointer ${testTierOverride === "pro_plus" ? 'bg-lightGray text-black focus:bg-lightGray hover:text-black' : 'bg-white dark:bg-darkGray dark:text-white text-black'}`}
                                        >
                                            <span className="font-medium">Pro+</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/account/privacy" className="cursor-pointer flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Privacy settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setOpenDeleteAccountDialog(true);
                                    }}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete my account
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={async () => {
                                    await signOutUser();
                                    await signOutServer();
                                    router.push(loginHref);
                                }} className="bg-red-400 hover:bg-red-500 text-white cursor-pointer">
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DeleteAccountDialog
                            open={openDeleteAccountDialog}
                            onOpenChange={setOpenDeleteAccountDialog}
                        />
                        <ConnectHevyDialog
                            openConnectHevyDialog={openConnectHevyDialog}
                            handleOpenConnectHevyDialog={(open) => {
                                setOpenConnectHevyDialog(open);
                                if (!open) {
                                  setDropdownOpen(false);
                                }
                              }}
                            />
                    </li>
                );
            }
            return (
                <li
                    key={nav.id}
                    className={ `font-main font-normal cursor-pointer text-[16px] text-black dark:text-white ${index === navLinksToShow.length - 1 ? "mr-0" : "mr-10"}` }
                >
                    <Link href={navIdToUrl[nav.id] ?? `/${nav.id}`} className="flex items-center gap-2">
                        <NavLinkIcon navId={nav.id} />
                        {nav.title}
                    </Link>
                </li>
            );
        });
    } else {
        return navLinks.map((nav, index) => {
            if (nav.id === "cta") return null;
            if (nav.id === "log-in") {
                return (
                    <li
                        key={nav.id}
                        className={ `font-main font-normal cursor-pointer text-[16px] text-black dark:text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                    >
                        <Link href={loginHref} className="flex items-center gap-2">
                            <NavLinkIcon navId={nav.id} />
                            {nav.title}
                        </Link>
                    </li>
                );
            }
            return (
                <li
                    key={nav.id}
                    className={ `font-main font-normal cursor-pointer text-[16px] text-black dark:text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                >
                    <Link href={navIdToUrl[nav.id] ?? `/${nav.id}`} className="flex items-center gap-2">
                        <NavLinkIcon navId={nav.id} />
                        {nav.title}
                    </Link>
                </li>
            );
        });
    }
};

/**
 * Navbar composes the global header, switching between full navigation and mobile drawer as the viewport changes.
 */
export const Navbar: React.FC = () => {
    const pathname = usePathname();

    return (
        <nav className="w-full flex py-2 justify-between items-center bg-white dark:bg-darkGray relative z-50 md:hidden">
            <Link href={ "/" } aria-label="Proxima home">
                <img src={ (proxima_logo).src } alt="Proxima Logo" className="dark:sm:block hidden max-sm:hidden h-10 w-auto" />
                <img src={ (proxima_logo_white_full_text).src } alt="Proxima Logo" className="dark:hidden block max-sm:hidden h-10 w-auto" />
            </Link>
            <ul className="list-none sm:flex hidden justify-end items-center flex-1 relative z-50 pr-6">
                {/* {!pathname.startsWith("/build-program") && pathname !== "/pricing" && (
                    <li className="mr-6">
                        <BuyMeCoffee />
                    </li>
                )} */}
                {NavItems(pathname)}
            </ul>
            <div className="sm:hidden flex flex-1 relative items-center pr-2">
                <div className="flex-1 flex justify-start items-center min-w-0">
                    <NavDrawer />
                </div>
                <Link href={ "/" } className="absolute left-1/2 -translate-x-1/2" aria-label="Proxima home">
                    <img src={ (proxima_logo_black).src } alt="Proxima Logo" className="h-10 w-auto sm:hidden hidden dark:block" />
                    <img src={ (proxima_logo_white).src } alt="Proxima Logo" className="h-10 w-auto sm:hidden dark:hidden" />
                </Link>
                <div className="flex-1 flex justify-end items-center min-w-0">
                    {pathname.startsWith("/build-program") ? (
                        <Suspense fallback={<div className="w-10" aria-hidden />}>
                            <BuildProgramToolbarEnd />
                        </Suspense>
                    ) : (
                        <div />
                    )}
                </div>
            </div>
        </nav>
    );
};


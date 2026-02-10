/* eslint-disable @next/next/no-img-element */
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavDrawer } from "./NavDrawer";
import { proxima_logo, proxima_logo_white } from "public";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserContext } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ConnectHevyDialog } from "./ConnectHevyDialog";
import { useEffect, useState } from "react";
import { signOutUser } from "@/api/authentication";
import { useHevySecret, useMyFeatureLimits, useUserFullName } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
    getTestTierOverride,
    isTestUser,
    setTestTierOverride,
    type TestTierOverride,
} from "@/api/featureLimits";
import { Crown, LockIcon } from "lucide-react";
import { authenticatedNavLinks, navLinks } from "@/assets/constants";
import { useTheme } from "next-themes"
// import { BuyMeCoffee } from "../ui/buy-me-coffee";

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

const NavItems = (pathname: string) => {
    // this should get the user if they logged in server side (via social logins)
    const { user, isLoading } = useUserContext();
    const { theme, setTheme } = useTheme()
    const { data: userFullName } = useUserFullName(user?.id ? user.id : undefined, "user");
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: featureLimits } = useMyFeatureLimits(user);
    const queryClient = useQueryClient();
    const isPro = featureLimits?.has_active_subscription === true;
    const stripePortalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL?.trim() || "";
    const navLinksToShow = authenticatedNavLinks.filter(
        (nav) => !(nav.id === "pricing" && isPro)
    );

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [testTierOverride, setTestTierOverrideState] = useState<TestTierOverride | null>(() => getTestTierOverride());
    const [openConnectHevyDialog, setOpenConnectHevyDialog] = useState(false);
    // const { isHevy, setIsHevy } = useIsHevy();

    useEffect(() => {
        if (openConnectHevyDialog) {
          setDropdownOpen(false);
        }
    }, [openConnectHevyDialog]);

    if (pathname === "/auth/login" || pathname === "/auth/sign-up" || pathname === "/auth/forgot-password") {
        return <></>;
    }

    // Don't render authentication-dependent content while loading
    if (isLoading) {
        return navLinks.map((nav, index) => {
            return (
                <div key={ index }>
                    { nav.id === "cta" ?
                        // Temporarily deprecated - mobile app download
                        // <Link href="/download">
                        //     <Button text={ "Download App" } styles={ `py-2 dark:bg-darkGray dark:text-white` } />
                        // </Link>
                        null
                    : nav.id === "log-in" ?
                        <li
                        key={ nav.id }
                        className={ `font-main font-normal cursor-pointer text-[16px] text-black ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                    >
                            <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                        </li>
                    :
                        <li
                            key={ nav.id }
                            className={ `font-main font-normal cursor-pointer text-[16px] text-black ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                        >
                            <Link href={ `/${nav.id}` }>{nav.title}</Link>
                        </li>
                    }
                </div>
            );
        })
    }

    if (user) {
        return navLinksToShow.map((nav, index) => {
            return (
                <div key={ index }>
                    { nav.id === "cta" ?
                        // Temporarily deprecated - mobile app download
                        // <Link href="/download">
                        //     <Button text={ "Download App" } styles={ `py-2 dark:bg-offWhite dark:text-black` } />
                        // </Link>
                        null
                    : nav.id === "log-in" ?
                        <li
                        key={ nav.id }
                        className={ `font-main font-normal cursor-pointer text-[16px] text-black ${index === navLinksToShow.length - 1 ? "mr-0" : "mr-10"}` }
                    >
                        <DropdownMenu open={dropdownOpen} onOpenChange={(open) => {
                            setDropdownOpen(open);
                            if (open && isTestUser(user)) setTestTierOverrideState(getTestTierOverride());
                        }}>
                            <DropdownMenuTrigger asChild>
                                <div className="cursor-pointer flex flex-row items-center">
                                    <Avatar>
                                        <AvatarImage src={ user?.user_metadata?.avatar_url } />
                                        <AvatarFallback>
                                            { userFullName?.charAt(0) }
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
                                        <span className="text-xs text-gray-500 text-wrap max-w-[200px]">700+ exercises, rep ranges, rpe ranges, amrap ...</span>
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
                                        <span className="text-xs text-gray-500 text-wrap max-w-[200px]">400+ exercises, custom exercises,routines ...</span>
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
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={async () => {
                                    await signOutUser();
                                    await signOutServer();
                                }} className="bg-red-400 hover:bg-red-500 text-white cursor-pointer">
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    :
                        <li
                            key={ nav.id }
                            className={ `font-main font-normal cursor-pointer text-[16px] text-black dark:text-white ${index === navLinksToShow.length - 1 ? "mr-0" : "mr-10"}` }
                        >
                            <Link href={ `/${nav.id}` }>{nav.title}</Link>
                        </li>
                    }
                </div>
            );
        })
    } else {
        return navLinks.map((nav, index) => {
            return (
                <div key={ index }>
                    { nav.id === "cta" ?
                        // Temporarily deprecated - mobile app download
                        // <Link href="/download">
                        //     <Button text={ "Download App" } styles={ `py-2` } />
                        // </Link>
                        null
                    : nav.id === "log-in" ?
                        <li
                            key={ nav.id }
                            className={ `font-main font-normal cursor-pointer text-[16px] text-black dark:text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                        >
                            <Link href={ `/auth/login` }>{nav.title}</Link>
                            </li>
                    :
                        <li
                            key={ nav.id }
                            className={ `font-main font-normal cursor-pointer text-[16px] text-black dark:text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                        >
                            <Link href={ `/${nav.id}` }>{nav.title}</Link>
                        </li>
                    }
                </div>
            );
        })
    }
};

export const Navbar: React.FC = () => {
    const pathname = usePathname();

    return (
        <nav className="w-full flex py-2 justify-between items-center bg-white dark:bg-darkGray relative z-50">
            <Link href={ "/" } >
                <img src={ (proxima_logo as any).src } alt="Proxima Logo" className="dark:sm:block hidden max-sm:hidden h-[40px] w-[auto]" />
                <img src={ (proxima_logo_white as any).src } alt="Proxima Logo" className="dark:hidden block max-sm:hidden h-[40px] w-[auto]" />
            </Link>
            <ul className="list-none sm:flex hidden justify-end items-center flex-1 relative z-50 pr-6">
                {/* {!pathname.startsWith("/build-program") && pathname !== "/pricing" && (
                    <li className="mr-6">
                        <BuyMeCoffee />
                    </li>
                )} */}
                {NavItems(pathname)}
            </ul>
            <div className="sm:hidden flex flex-1 justify-between items-center">
                <NavDrawer />
                <div></div>
            </div>
        </nav>
    );
};


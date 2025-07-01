"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { authenticatedNavLinks, navLinks } from "../../assets/constants/index";
import { Button } from "../generic/Button";
import { NavDrawer } from "./NavDrawer";
import { proxima_logo } from "public";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserContext } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ConnectHevyDialog } from "./ConnectHevyDialog";
import { useEffect, useState } from "react";
import { signOutUser } from "@/api/authentication";
import { useHevySecret, useUserFullName } from "@/api/hooks";
import { useIsHevy } from "@/contexts/HevyContext";
import { toast } from "sonner";
import { LockIcon } from "lucide-react";

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
    const { data: userFullName } = useUserFullName(user?.id, "user");
    const { data: hevyApiKey } = useHevySecret(user);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [openConnectHevyDialog, setOpenConnectHevyDialog] = useState(false);
    const { isHevy, setIsHevy } = useIsHevy();

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
                        <Link href="/download">
                            <Button text={ "Download App" } styles={ `py-2` } />
                        </Link>
                    : nav.id === "log-in" ?
                        <li
                        key={ nav.id }
                        className={ `font-main font-normal cursor-pointer text-[16px] text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                    >
                            <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                        </li>
                    :
                        <li
                            key={ nav.id }
                            className={ `font-main font-normal cursor-pointer text-[16px] text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                        >
                            <Link href={ `/${nav.id}` }>{nav.title}</Link>
                        </li>
                    }
                </div>
            );
        })
    }

    if (user) {
        return authenticatedNavLinks.map((nav, index) => {
            return (
                <div key={ index }>
                    { nav.id === "cta" ?
                        <Link href="/download">
                            <Button text={ "Download App" } styles={ `py-2` } />
                        </Link>
                    : nav.id === "log-in" ?
                        <li
                        key={ nav.id }
                        className={ `font-main font-normal cursor-pointer text-[16px] text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                    >
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
                                <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                                    Workout Format
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        toast.info("Proxima Format selected");
                                        setIsHevy(false);
                                    }}
                                    className={`cursor-pointer focus:text-current ${!isHevy ? 'bg-lightSecondary text-white hover:text-white hover:bg-lightSecondary focus:text-white focus:bg-lightSecondary' : 'bg-white hover:bg-white'}`}
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
                                    className={`cursor-pointer focus:text-current ${isHevy ? 'bg-lightSecondary text-white hover:text-white hover:bg-lightSecondary focus:text-white focus:bg-lightSecondary' : 'bg-white hover:bg-white'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">Hevy Format</span>
                                        <span className="text-xs text-gray-500 text-wrap max-w-[200px]">400+ exercises, custom exercises,routines ...</span>
                                    </div>
                                </DropdownMenuItem>
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
                            className={ `font-main font-normal cursor-pointer text-[16px] text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
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
                        <Link href="/download">
                            <Button text={ "Download App" } styles={ `py-2` } />
                        </Link>
                    : nav.id === "log-in" ?
                        <li
                            key={ nav.id }
                            className={ `font-main font-normal cursor-pointer text-[16px] text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
                        >
                            <Link href={ `/auth/login` }>{nav.title}</Link>
                            </li>
                    :
                        <li
                            key={ nav.id }
                            className={ `font-main font-normal cursor-pointer text-[16px] text-white ${index === navLinks.length - 1 ? "mr-0" : "mr-10"}` }
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
        <nav className="w-full flex py-2 justify-between items-center navbar">
            <Link href={ "/" } >
                <img src={ (proxima_logo as any).src } alt="Proxima Logo" className="max-sm:hidden h-[40px] w-[auto]" />
            </Link>
            <ul className="list-none sm:flex hidden justify-end items-center flex-1 z-6">
                {NavItems(pathname)}
            </ul>
            <div className="sm:hidden flex flex-1 justify-between items-center">
                <NavDrawer />
                <div></div>
            </div>
        </nav>
    );
};


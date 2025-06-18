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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ConnectHevyDialog } from "./ConnectHevyDialog";
import { useEffect, useState } from "react";
import { signOutUser } from "@/api/authentication";
import { createClient } from '@/utils/supabase/client';

const NavItems = (pathname: string) => {
    const { user, setUser } = useUserContext();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [openConnectHevyDialog, setOpenConnectHevyDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
            }
            setIsLoading(false);
        };
        checkSession();
    }, [setUser]);

    useEffect(() => {
        if (openConnectHevyDialog) {
          setDropdownOpen(false);
        }
    }, [openConnectHevyDialog]);

    if (pathname === "/auth/login" || pathname === "/auth/sign-up" || pathname === "/auth/forgot-password") {
        return <></>;
    }

    if (isLoading) {
        return <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />;
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
                                        <AvatarImage src={ user?.user_metadata.avatar_url } />
                                        <AvatarFallback>
                                            { user?.user_metadata.full_name.charAt(0) }
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>
                                    Hi, { user?.user_metadata.full_name }
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setOpenConnectHevyDialog(true);
                                }}>
                                    Connect Hevy App
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOutUser()} className="bg-red-400 text-white">
                                    Log out
                                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
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
                            <a href="https://app.proximafitness.com/">Log In</a>
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
                <img src={ (proxima_logo as any).src } alt="Proxima Logo" className="max-sm:hidden h-[50px] w-[auto]" />
            </Link>
            <ul className="list-none sm:flex hidden justify-end items-center flex-1 z-6">
                {NavItems(pathname)}
            </ul>
            <div className="sm:hidden flex flex-1 justify-end items-center">
                <NavDrawer />
            </div>
        </nav>
    );
};


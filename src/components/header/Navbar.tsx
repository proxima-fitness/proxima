"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { authenticatedNavLinks, navLinks } from "../../assets/constants/index";
import { Button } from "../generic/Button";
import { NavDrawer } from "./NavDrawer";
import { proxima_logo } from "public";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSessionContext } from "@/contexts/SessionContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const NavItems = (pathname: string) => {
    const { session } = useSessionContext();

    if (pathname === "/auth/login" || pathname === "/auth/sign-up" || pathname === "/auth/forgot-password") {
        console.log("entered 1");
        return (
            <></>
        )
    } else if (session?.user) {
        console.log("entered 2");
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
                            <Avatar>
                                <AvatarImage src={ session?.user?.user_metadata.avatar_url } />
                                <AvatarFallback>
                                    { session?.user?.user_metadata.full_name.charAt(0) }
                                </AvatarFallback>
                            </Avatar>
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
        console.log("entered 3");
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


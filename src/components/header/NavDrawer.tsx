/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from 'react';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import { navLinks } from "../../assets/constants/index";
import menu from "../../../public/menu.svg";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HardDriveDownloadIcon, LogInIcon, NotebookTextIcon, PersonStandingIcon, SearchIcon, TerminalSquareIcon } from 'lucide-react';
import { proxima_logo } from 'public';

type Anchor = 'top' | 'left' | 'bottom' | 'right';

export const NavDrawer: React.FC = () => {


        //     <List>
        //         {navLinks.map((link) => (
        //             <ListItem key={ link.id } disablePadding>
        //                 { link.id === "log-in" ?
        //                     <a href="https://app.proximafitness.com/">
        //                         <ListItemButton>
        //                             <ListItemIcon>
        //                                 <LogInIcon style={ { color: "#5ce1e6" } } />
        //                             </ListItemIcon>
        //                             <ListItemText primary={ link.title } />
        //                         </ListItemButton>
        //                     </a>
        //         : link.id === "cta" ?
        //             <Link href="/download">
        //                 <ListItemButton>
        //                     <ListItemIcon>
        //                         <HardDriveDownloadIcon style={ { color: "#5ce1e6" } } />
        //                     </ListItemIcon>
        //                     <ListItemText primary={ link.title } />
        //                 </ListItemButton>
        //             </Link>
        //       :
        //             <Link href={ `/${link.id}` }>
        //                 <ListItemButton>
        //                     <ListItemIcon>
        //                         { link.id === "programs" && <NotebookTextIcon style={ { color: "#5ce1e6" } } /> }
        //                         { link.id === "about" && <PersonStandingIcon style={ { color: "#5ce1e6" } } /> }
        //                         { link.id === "program-builder" && <TerminalSquareIcon style={ { color: "#5ce1e6" } } /> }
        //                     </ListItemIcon>
        //                     <ListItemText primary={ link.title } />
        //                 </ListItemButton>
        //             </Link>
        //         }
        //             </ListItem>
        // ))}


    return (
        <React.Fragment key={ "right" }>
            <Button>
                <img
                    src={ (menu as any).src }
                    alt="menu"
                    className="w-[28px] h-[28px] object-contain"
                />
            </Button>
            <Link href={ "/" } >
                <img src={ (proxima_logo as any).src } alt="Proxima Logo" className="h-[50px] w-[auto]" />
            </Link>

        </React.Fragment>
    );
};

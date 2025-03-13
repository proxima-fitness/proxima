/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from 'react';
import Box from '@mui/material/Box';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { navLinks } from "../../assets/constants/index";
import LoginIcon from '@mui/icons-material/Login';
import menu from "../../../public/menu.svg";
import Link from "next/link";
import { HardDriveDownloadIcon, LogInIcon, NotebookTextIcon, PersonStandingIcon, SearchIcon, TerminalSquareIcon } from 'lucide-react';

type Anchor = 'top' | 'left' | 'bottom' | 'right';

export const NavDrawer: React.FC = () => {

    const [state, setState] = React.useState({
        right: false,
    } );

    const toggleDrawer =
        (anchor: Anchor, open: boolean) =>
        (event: React.KeyboardEvent | React.MouseEvent) => {
        if (
            event &&
            event.type === 'keydown' &&
            ((event as React.KeyboardEvent).key === 'Tab' ||
            (event as React.KeyboardEvent).key === 'Shift')
        ) {
            return;
        }

        setState({ ...state, [anchor]: open });
    };

    const list = (anchor: Anchor) => (
        <Box
            sx={ {height: "100%", color: "white", background: `linear-gradient(
                144.39deg,
                #ffffff -278.56%,
                #6d6d6d -78.47%,
                #11101d 91.61%
            );` , width: anchor === 'top' || anchor === 'bottom' ? 'auto' : 250 } }
            role="presentation"
            onClick={ toggleDrawer(anchor, false) }
            onKeyDown={ toggleDrawer(anchor, false) }
        >
            <List>
                {navLinks.map((link) => (
                    <ListItem key={ link.id } disablePadding>
                        { link.id === "log-in" ?
                            <a href="https://app.proximafitness.com/">
                                <ListItemButton>
                                    <ListItemIcon>
                                        <LogInIcon style={ { color: "#5ce1e6" } } />
                                    </ListItemIcon>
                                    <ListItemText primary={ link.title } />
                                </ListItemButton>
                            </a>
                : link.id === "cta" ?
                    <Link href="/download">
                        <ListItemButton>
                            <ListItemIcon>
                                <HardDriveDownloadIcon style={ { color: "#5ce1e6" } } />
                            </ListItemIcon>
                            <ListItemText primary={ link.title } />
                        </ListItemButton>
                    </Link>
              :
                    <Link href={ `/${link.id}` }>
                        <ListItemButton>
                            <ListItemIcon>
                                { link.id === "programs" && <NotebookTextIcon style={ { color: "#5ce1e6" } } /> }
                                { link.id === "about" && <PersonStandingIcon style={ { color: "#5ce1e6" } } /> }
                                { link.id === "program-builder" && <TerminalSquareIcon style={ { color: "#5ce1e6" } } /> }
                            </ListItemIcon>
                            <ListItemText primary={ link.title } />
                        </ListItemButton>
                    </Link>
                }
                    </ListItem>
        ))}
            </List>
        </Box>
  );

    return (
        <div>
            <React.Fragment key={ "right" }>
                <Button onClick={ toggleDrawer("right", true) }>
                    <img
                        src={ (menu as any).src }
                        alt="menu"
                        className="w-[28px] h-[28px] object-contain"
                    />
                </Button>
                <SwipeableDrawer
                        anchor={ "right" }
                        open={ state["right"] }
                        onClose={ toggleDrawer("right", false) }
                        onOpen={ toggleDrawer("right", true) }
                    >
                    {list("right")}
                </SwipeableDrawer>
            </React.Fragment>
        </div>
    );
};

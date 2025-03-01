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
import HomeIcon from '@mui/icons-material/Home';
import TerminalIcon from '@mui/icons-material/Terminal';
import FeaturedVideoIcon from '@mui/icons-material/FeaturedVideo';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import LoginIcon from '@mui/icons-material/Login';
import DownloadIcon from '@mui/icons-material/Download';
import menu from "../../../public/menu.svg";
import Link from "next/link";
import Image from "next/image";

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
                        { link.id === "sign-in" ?
                            <a href="https://app.proximafitness.com/">
                                <ListItemButton>
                                    <ListItemIcon>
                                        <LoginIcon style={ { color: "#5ce1e6" } } />
                                    </ListItemIcon>
                                    <ListItemText primary={ link.title } />
                                </ListItemButton>
                            </a>
                : link.id === "cta" ?
                    <Link href="/download">
                        <ListItemButton>
                            <ListItemIcon>
                                <LoginIcon style={ { color: "#5ce1e6" } } />
                            </ListItemIcon>
                            <ListItemText primary={ link.title } />
                        </ListItemButton>
                    </Link>
              :
                    <Link href={ `/${link.id}` }>
                        <ListItemButton>
                            <ListItemIcon>
                                { link.id === "home" && <HomeIcon style={ { color: "#5ce1e6" } } /> }
                                { link.id === "programs" && <TerminalIcon style={ { color: "#5ce1e6" } } /> }
                                { link.id === "create-programs" && <FeaturedVideoIcon style={ { color: "#5ce1e6" } } /> }
                                { link.id === "faqs" && <LiveHelpIcon style={ { color: "#5ce1e6" } } /> }
                                { link.id === "cta" && <DownloadIcon style={ { color: "#5ce1e6" } } /> }
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
                    <Image
                        src={ (menu as any).src } width={ 500 } height={ 500 }
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

"use client";

/*
 * @module NavDrawer
 * @description Mobile navigation drawer trigger that opens the sidebar-based navigation experience.
 * @dependsOn Custom sidebar trigger component and React fragment helpers.
 * @usedBy Navbar on small viewports to expose navigation without occupying horizontal space.
 */

import * as React from 'react';
import { CustomTrigger } from '../CustomSidebarTrigger';

/**
 * NavDrawer renders the hamburger trigger that controls the mobile sidebar navigation.
 */
export const NavDrawer: React.FC = () => {

    return (
        <React.Fragment key={ "burger menu" }>
            <CustomTrigger />
        </React.Fragment>
    );
};

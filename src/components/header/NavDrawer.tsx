"use client";

import * as React from 'react';
import { CustomTrigger } from '../CustomSidebarTrigger';

export const NavDrawer: React.FC = () => {

    return (
        <React.Fragment key={ "burger menu" }>
            <CustomTrigger />
        </React.Fragment>
    );
};

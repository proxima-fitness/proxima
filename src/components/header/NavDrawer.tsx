/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from 'react';
import Link from "next/link";
import { proxima_logo } from 'public';
import { CustomTrigger } from '../CustomSidebarTrigger';

export const NavDrawer: React.FC = () => {

    return (
        <React.Fragment key={ "burger menu" }>
            <CustomTrigger />
            <Link href={ "/" } >
                <img src={ (proxima_logo as any).src } alt="Proxima Logo" className="h-[40px] w-[auto]" />
            </Link>
        </React.Fragment>
    );
};

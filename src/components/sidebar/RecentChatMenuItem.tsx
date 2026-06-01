"use client";

import Link from "next/link";
import { EllipsisVertical, Pencil, Pin, PinOff } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface IRecentChatMenuItemProps {
    chat: TChatListItem;
    isActive: boolean;
    onNavigate: () => void;
    onRename: (chat: TChatListItem) => void;
    onPinToggle: (chat: TChatListItem, pinned: boolean) => void;
}

export function RecentChatMenuItem({
    chat,
    isActive,
    onNavigate,
    onRename,
    onPinToggle,
}: IRecentChatMenuItemProps) {
    const displayTitle = chat.title?.trim() || "Untitled chat";
    const href = `/build-program?chat=${encodeURIComponent(chat.id)}${
        chat.program_id ? `&shareId=${encodeURIComponent(chat.program_id)}` : ""
    }`;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                tooltip={displayTitle}
                isActive={isActive}
                className={cn(isActive && "bg-accent text-accent-foreground")}
            >
                <Link
                    href={href}
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onClick={onNavigate}
                >
                    <span className="min-w-0 flex-1 truncate font-main">{displayTitle}</span>
                </Link>
            </SidebarMenuButton>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover aria-label={`Options for ${displayTitle}`}>
                        <EllipsisVertical />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="min-w-36">
                    <DropdownMenuItem
                        className="cursor-pointer font-main"
                        onSelect={(e) => {
                            e.preventDefault();
                            onPinToggle(chat, !chat.pinned);
                        }}
                    >
                        {chat.pinned ? (
                            <>
                                <PinOff className="h-4 w-4 mr-2" />
                                Unpin
                            </>
                        ) : (
                            <>
                                <Pin className="h-4 w-4 mr-2" />
                                Pin
                            </>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer font-main"
                        onSelect={(e) => {
                            e.preventDefault();
                            onRename(chat);
                        }}
                    >
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    );
}

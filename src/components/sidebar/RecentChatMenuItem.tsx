"use client";

import Link from "next/link";
import { EllipsisVertical, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
    onDelete: (chat: TChatListItem) => void;
}

export function RecentChatMenuItem({
    chat,
    isActive,
    onNavigate,
    onRename,
    onPinToggle,
    onDelete,
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
                    <span className="min-w-0 flex-1 truncate font-third">{displayTitle}</span>
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
                        className="cursor-pointer font-third"
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
                        className="cursor-pointer font-third"
                        onSelect={(e) => {
                            e.preventDefault();
                            onRename(chat);
                        }}
                    >
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer font-third text-destructive focus:text-destructive"
                        onSelect={(e) => {
                            e.preventDefault();
                            onDelete(chat);
                        }}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    );
}

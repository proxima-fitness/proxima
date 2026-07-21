"use client";

/**
 * @module account/EditProfileContent
 *
 * Client body for /account/edit-profile: identity section first, Constraint profile
 * editor below, dual Save, and page leave warn when either section is dirty.
 *
 * Depends on: UserContext, EditProfile, ConstraintProfileSection, leave guard, ConfirmDialog.
 * Used by: (app)/account/edit-profile/page.tsx.
 */

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ConstraintProfileSection } from "@/components/account/ConstraintProfileSection";
import {
    EDIT_PROFILE_LEAVE_DESCRIPTION,
    EDIT_PROFILE_LEAVE_TITLE,
    useEditProfileLeaveGuard,
} from "@/components/account/use-edit-profile-leave-guard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditProfile } from "@/components/profile/EditProfile";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useUserContext } from "@/contexts/UserContext";

const EDIT_PROFILE_CARD_CLASS =
    "rounded-2xl border border-border/60 bg-card shadow-sm";

/** Renders Edit profile page: identity form + Constraint profile editor + leave warn. */
export function EditProfileContent() {
    const { user, isLoading: isUserLoading } = useUserContext();
    const {
        setDirty,
        leaveDialogOpen,
        onLeaveDialogOpenChange,
        onDiscardLeave,
    } = useEditProfileLeaveGuard();
    const dirtyPartsRef = useRef({ identity: false, constraint: false });

    const onIdentityDirtyChange = (dirty: boolean) => {
        dirtyPartsRef.current.identity = dirty;
        setDirty(
            dirtyPartsRef.current.identity || dirtyPartsRef.current.constraint,
        );
    };

    const onConstraintDirtyChange = (dirty: boolean) => {
        dirtyPartsRef.current.constraint = dirty;
        setDirty(
            dirtyPartsRef.current.identity || dirtyPartsRef.current.constraint,
        );
    };

    if (isUserLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center px-4">
                <Spinner size="medium" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
                <p className="text-muted-foreground mb-4 max-w-md">
                    Sign in to edit your profile.
                </p>
                <Link
                    href="/auth/login"
                    className="text-secondary underline underline-offset-2 hover:text-lightSecondary"
                >
                    Log in
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 px-4 py-10 text-foreground">
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <Link
                        href="/profile"
                        className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-lightSecondary"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Back to profile
                    </Link>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                        Edit profile
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Update your identity and inspect what the coach remembers about you.
                    </p>
                </div>

                <section aria-labelledby="identity-heading">
                    <Card className={EDIT_PROFILE_CARD_CLASS}>
                        <CardHeader>
                            <h2
                                id="identity-heading"
                                className="font-semibold leading-none tracking-tight"
                            >
                                Identity
                            </h2>
                            <CardDescription>
                                Name, username, bio, and profile photo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EditProfile
                                user={user}
                                onDirtyChange={onIdentityDirtyChange}
                            />
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="constraint-profile-heading">
                    <Card className={EDIT_PROFILE_CARD_CLASS}>
                        <CardHeader>
                            <h2
                                id="constraint-profile-heading"
                                className="font-semibold leading-none tracking-tight"
                            >
                                Constraint Profile
                            </h2>
                            <CardDescription>
                                Training constraints the coach uses when building programs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConstraintProfileSection
                                user={user}
                                onDirtyChange={onConstraintDirtyChange}
                            />
                        </CardContent>
                    </Card>
                </section>
            </div>

            <ConfirmDialog
                open={leaveDialogOpen}
                onOpenChange={onLeaveDialogOpenChange}
                title={EDIT_PROFILE_LEAVE_TITLE}
                description={EDIT_PROFILE_LEAVE_DESCRIPTION}
                cancelLabel="Stay"
                confirmLabel="Discard"
                onConfirm={onDiscardLeave}
            />
        </div>
    );
}

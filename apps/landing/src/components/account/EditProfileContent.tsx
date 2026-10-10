"use client";

/**
 * @module account/EditProfileContent
 *
 * Client body for /profile/edit: identity → Constraint profile → Training
 * profile → Body measurements; separate Saves; leave warn when identity,
 * constraints, or Training profile is dirty.
 *
 * Depends on: UserContext, EditProfile, ConstraintProfileSection,
 *   TrainingProfileSection, BodyMeasurementsSection, leave guard, ConfirmDialog,
 *   PROFILE_SECTION_CARD_SURFACE_CLASS.
 * Used by: (app)/profile/edit/page.tsx.
 */

import { useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BodyMeasurementsSection } from "@/components/account/BodyMeasurementsSection";
import { ConstraintProfileSection } from "@/components/account/ConstraintProfileSection";
import { TrainingProfileSection } from "@/components/account/TrainingProfileSection";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditProfile } from "@/components/profile/EditProfile";
import { PROFILE_SECTION_CARD_SURFACE_CLASS } from "@/components/profile/profileSectionShell";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useUserContext } from "@/contexts/UserContext";
import { editProfileLeaveGuard } from "@/hooks/create-leave-guard";
import { buildAuthLoginHref } from "@/lib/sign-in-return";

/** Renders Edit profile page: Agentic memory sections + leave warn. */
export function EditProfileContent() {
    const { user, isLoading: isUserLoading } = useUserContext();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const loginHref = buildAuthLoginHref(pathname, searchParams);
    const {
        setDirty,
        leaveDialogOpen,
        pendingHref,
        onLeaveDialogOpenChange,
        onDiscardLeave,
    } = editProfileLeaveGuard.useLeaveGuard();
    const dirtyPartsRef = useRef({
        identity: false,
        constraint: false,
        training: false,
    });

    const syncLeaveDirty = () => {
        const { identity, constraint, training } = dirtyPartsRef.current;
        setDirty(identity || constraint || training);
    };

    const onIdentityDirtyChange = (dirty: boolean) => {
        dirtyPartsRef.current.identity = dirty;
        syncLeaveDirty();
    };

    const onConstraintDirtyChange = (dirty: boolean) => {
        dirtyPartsRef.current.constraint = dirty;
        syncLeaveDirty();
    };

    const onTrainingDirtyChange = (dirty: boolean) => {
        dirtyPartsRef.current.training = dirty;
        syncLeaveDirty();
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
                    href={loginHref}
                    className="text-secondary underline underline-offset-2 hover:text-lightSecondary"
                >
                    Log in
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted px-3 py-6 text-foreground sm:px-4 sm:py-10">
            <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
                <div>
                    <Link
                        href="/profile"
                        className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-lightSecondary"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Back to profile
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight sm:mt-4 sm:text-4xl">
                        Edit profile
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        Update your identity and inspect what the coach remembers about you.
                    </p>
                </div>

                <section aria-labelledby="identity-heading">
                    <Card className={PROFILE_SECTION_CARD_SURFACE_CLASS}>
                        <CardHeader className="p-4 sm:p-6">
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
                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                            <EditProfile
                                user={user}
                                onDirtyChange={onIdentityDirtyChange}
                            />
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="constraint-profile-heading">
                    <Card className={PROFILE_SECTION_CARD_SURFACE_CLASS}>
                        <CardHeader className="p-4 sm:p-6">
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
                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                            <ConstraintProfileSection
                                user={user}
                                onDirtyChange={onConstraintDirtyChange}
                            />
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="training-profile-heading">
                    <Card className={PROFILE_SECTION_CARD_SURFACE_CLASS}>
                        <CardHeader className="p-4 sm:p-6">
                            <h2
                                id="training-profile-heading"
                                className="font-semibold leading-none tracking-tight"
                            >
                                Training Profile
                            </h2>
                            <CardDescription>
                                Person facts the coach uses for programming context.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                            <TrainingProfileSection
                                user={user}
                                onDirtyChange={onTrainingDirtyChange}
                            />
                        </CardContent>
                    </Card>
                </section>

                <section aria-labelledby="body-measurements-heading">
                    <Card className={PROFILE_SECTION_CARD_SURFACE_CLASS}>
                        <CardHeader className="p-4 sm:p-6">
                            <h2
                                id="body-measurements-heading"
                                className="font-semibold leading-none tracking-tight"
                            >
                                Body Measurements
                            </h2>
                            <CardDescription>
                                Latest check-in and recent history from your Hevy backup
                                (read-only).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                            <BodyMeasurementsSection user={user} />
                        </CardContent>
                    </Card>
                </section>
            </div>

            <ConfirmDialog
                open={leaveDialogOpen}
                onOpenChange={onLeaveDialogOpenChange}
                title={editProfileLeaveGuard.title}
                description={editProfileLeaveGuard.description}
                cancelLabel="Stay"
                confirmLabel="Discard"
                confirmHref={pendingHref ?? undefined}
                onConfirm={onDiscardLeave}
            />
        </div>
    );
}

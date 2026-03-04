"use client";

/**
 * @module components/dashboard/EditProfile
 * Edit profile form rendered inside the profile page Edit Profile dialog.
 * Fields: first name, last name, username, bio; profile picture display (no upload in minimal version).
 * Depends on: useUserMetadata, updateUserMetadataPublic, shadcn DialogHeader/Title/Footer, Input, Textarea, Label, Button, Avatar.
 * Used by: DashboardContent (inside DialogContent).
 */

import { User } from "@supabase/supabase-js";
import { useUserMetadata, useProfilePictureByID } from "@/api/hooks";
import { updateUserMetadataPublic } from "@/api/users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
	RegExpMatcher,
	englishDataset,
	englishRecommendedTransformers,
} from 'obscenity';
import { PROFANITY_ERROR_MESSAGE } from "@/assets/constants";

interface IEditProfileProps {
    user: User;
    onSuccess: () => void;
}

export function EditProfile({ user, onSuccess }: IEditProfileProps) {
    const { data: metaData, isLoading: loadingMetaData } = useUserMetadata(user.id);
    const { data: profilePicBlob } = useProfilePictureByID(user.id);

    if (loadingMetaData || !metaData) {
        return (
            <>
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-[90px] w-[90px] rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                    <Skeleton className="h-24 w-full" />
                </div>
            </>
        );
    }

    return (
        <EditProfileForm
            key={user.id}
            user={user}
            metaData={metaData}
            onSuccess={onSuccess}
            profilePicBlob={profilePicBlob}
        />
    );
}

interface IEditProfileFormProps {
    user: User;
    metaData: TUserDetails;
    onSuccess: () => void;
    profilePicBlob: Blob | null | undefined;
}

function EditProfileForm({ user, metaData, onSuccess, profilePicBlob }: IEditProfileFormProps) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        firstName: metaData.first_name ?? "",
        lastName: metaData.last_name ?? "",
        userName: metaData.username ?? "",
        bio: metaData.bio ?? "",
    });
    const [firstNameProfanity, setFirstNameProfanity] = useState(false);
    const [lastNameProfanity, setLastNameProfanity] = useState(false);
    const [usernameProfanity, setUsernameProfanity] = useState(false);
    const [bioProfanity, setBioProfanity] = useState(false);

    const matcher = useMemo(
        () =>
            new RegExpMatcher({
                ...englishDataset.build(),
                ...englishRecommendedTransformers,
            }),
        []
    );

    const hasAnyProfanity = firstNameProfanity || lastNameProfanity || usernameProfanity || bioProfanity;

    const profilePicUrl = useMemo(() => {
        if (!profilePicBlob) return null;
        return URL.createObjectURL(profilePicBlob);
    }, [profilePicBlob]);

    const { firstName, lastName, userName, bio } = form;
    const isDirty =
        metaData &&
        (metaData.first_name !== firstName ||
            metaData.last_name !== lastName ||
            metaData.username !== userName ||
            metaData.bio !== bio);

    const updateMutation = useMutation({
        mutationKey: ["user-metadata", user.id],
        mutationFn: async () => {
            if (hasAnyProfanity) throw new Error("Content contains profanity");
            await updateUserMetadataPublic(
                user,
                firstName.trim(),
                lastName.trim(),
                userName.trim(),
                bio.trim(),
                Intl.DateTimeFormat().resolvedOptions().timeZone
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["user-metadata", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["full-name", user.id, "user"] });
            await queryClient.invalidateQueries({ queryKey: ["profile-picture", user.id] });
            toast.success("Profile updated");
            onSuccess();
        },
        onError: (error) => {
            if (error instanceof Error && error.message === "Content contains profanity") {
                toast.error(PROFANITY_ERROR_MESSAGE);
            } else {
                toast.error(error instanceof Error ? error.message : "Failed to update profile");
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isDirty) return;
        if (hasAnyProfanity) {
            toast.error(PROFANITY_ERROR_MESSAGE);
            return;
        }
        updateMutation.mutate();
    };

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || "User";
    const initials = displayName
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Avatar className="h-[90px] w-[90px] shrink-0 rounded-full border-2 border-border">
                        {profilePicUrl ? (
                            <AvatarImage src={profilePicUrl} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-lg font-semibold bg-muted text-foreground">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4 w-full min-w-0">
                        <div className="space-y-2">
                            <Label htmlFor="edit-first-name">First name</Label>
                            <Input
                                id="edit-first-name"
                                value={firstName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setForm((p) => ({ ...p, firstName: value }));
                                    setFirstNameProfanity(matcher.getAllMatches(value).length > 0);
                                }}
                                placeholder="First name"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-last-name">Last name</Label>
                            <Input
                                id="edit-last-name"
                                value={lastName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setForm((p) => ({ ...p, lastName: value }));
                                    setLastNameProfanity(matcher.getAllMatches(value).length > 0);
                                }}
                                placeholder="Last name"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-username">username *</Label>
                            <Input
                                id="edit-username"
                                value={userName}
                                onChange={(e) => {
                                    const value = e.target.value.toLowerCase();
                                    setForm((p) => ({ ...p, userName: value }));
                                    setUsernameProfanity(matcher.getAllMatches(value).length > 0);
                                }}
                                placeholder="Username"
                                className="w-full lowercase"
                            />
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-bio">Bio</Label>
                    <Textarea
                        id="edit-bio"
                        value={bio}
                        onChange={(e) => {
                            const value = e.target.value;
                            setForm((p) => ({ ...p, bio: value }));
                            setBioProfanity(matcher.getAllMatches(value).length > 0);
                        }}
                        placeholder="Enter my Bio here ..."
                        className="min-h-[120px] w-full resize-y"
                        maxLength={250}
                    />
                </div>
            </div>
            <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                {hasAnyProfanity && (
                    <p className="text-sm text-destructive font-medium sm:order-first sm:flex-1">
                        Please remove profanity before saving.
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={!isDirty || updateMutation.isPending || hasAnyProfanity}
                    className="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                >
                    {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
            </DialogFooter>
        </form>
    );
}

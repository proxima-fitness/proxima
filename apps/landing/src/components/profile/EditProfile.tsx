"use client";

/**
 * @module components/profile/EditProfile
 * Identity form for the Edit profile account page: first name, last name, username,
 * bio, and profile picture upload/display.
 * Depends on: useUserMetadata, updateUserMetadataPublic, useProfilePictureContext,
 * storage/edge-functions, Input, Textarea, Label, Button, Avatar.
 * Used by: EditProfileContent.
 */

import { User } from "@supabase/supabase-js";
import { useUserMetadata, useProfilePictureByID } from "@/api/hooks";
import { updateUserMetadataPublic } from "@/api/users";
import { postTmpImage, getTmpPublicUrl, postProfilePic } from "@/api/storage";
import { postNsfwImageDetection } from "@/api/edge-functions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useRef, type ChangeEvent } from "react";
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
import { PROFANITY_ERROR_MESSAGE, PROFILE_PICTURE_NSFW_THRESHOLD, PROFILE_PICTURE_NSFW_MESSAGE } from "@/assets/constants/ui-constants";
import { useProfilePictureContext } from "@/contexts/ProfilePictureContext";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface IEditProfileProps {
    user: User;
    onSuccess?: () => void;
    /** Called when identity form dirty state changes (for page leave warn). */
    onDirtyChange?: (isDirty: boolean) => void;
}

export function EditProfile({ user, onSuccess, onDirtyChange }: IEditProfileProps) {
    const { data: metaData, isLoading: loadingMetaData } = useUserMetadata(user.id);
    const { data: profilePicBlob } = useProfilePictureByID(user.id);

    if (loadingMetaData || !metaData) {
        return (
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
        );
    }

    return (
        <EditProfileForm
            key={user.id}
            user={user}
            metaData={metaData}
            onSuccess={onSuccess}
            onDirtyChange={onDirtyChange}
            profilePicBlob={profilePicBlob}
        />
    );
}

interface IEditProfileFormProps {
    user: User;
    metaData: TUserDetails;
    onSuccess?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    profilePicBlob: Blob | null | undefined;
}

function EditProfileForm({ user, metaData, onSuccess, onDirtyChange, profilePicBlob }: IEditProfileFormProps) {
    const queryClient = useQueryClient();
    const { setProfilePicture } = useProfilePictureContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
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
    const [usernameTakenError, setUsernameTakenError] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

    const reportDirtyFor = (next: typeof form) => {
        onDirtyChange?.(
            metaData.first_name !== next.firstName ||
                metaData.last_name !== next.lastName ||
                metaData.username !== next.userName ||
                metaData.bio !== next.bio,
        );
    };

    const patchForm = (patch: Partial<typeof form>) => {
        const next = { ...form, ...patch };
        setForm(next);
        reportDirtyFor(next);
    };

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
            onDirtyChange?.(false);
            onSuccess?.();
        },
        onError: (error) => {
            if (error instanceof Error && error.message === "Content contains profanity") {
                toast.error(PROFANITY_ERROR_MESSAGE);
                return;
            }
            const code = (error as { code?: string }).code;
            if (code === "23505") {
                setUsernameTakenError(true);
                toast.error("This username is already taken.");
                return;
            }
            toast.error(error instanceof Error ? error.message : "Failed to update profile");
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

    const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const file = files[0];
        setUploadingPhoto(true);
        try {
            const name = uuidv4();
            await postTmpImage(name, file);
            const imageUrl = getTmpPublicUrl(name);

            if (!imageUrl) {
                toast.error("Could not process image");
                return;
            }
            const nsfwResult = await postNsfwImageDetection(imageUrl);
            if (Number(nsfwResult) >= PROFILE_PICTURE_NSFW_THRESHOLD) {
                toast.error(PROFILE_PICTURE_NSFW_MESSAGE);
                return;
            }
            const result = await postProfilePic(user, file, () => {
                queryClient.invalidateQueries({ queryKey: ["profile-picture", user.id] });
                setProfilePicture(file);
                toast.success("Profile picture updated");
            });
            if (!result) toast.error("Failed to upload profile picture");
        } finally {
            setUploadingPhoto(false);
            e.target.value = "";
        }
    };

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || "User";
    const initials = displayName
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex flex-col items-start gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            aria-hidden
                            onChange={handlePhotoChange}
                        />
                        <Avatar className="h-[90px] w-[90px] shrink-0 rounded-full border-2 border-border/60">
                            {profilePicUrl ? (
                                <AvatarImage src={profilePicUrl} alt="" className="object-cover" />
                            ) : null}
                            <AvatarFallback className="text-lg font-semibold bg-muted text-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingPhoto}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploadingPhoto ? "Uploading…" : profilePicBlob ? "Change photo" : "Add photo"}
                        </Button>
                    </div>
                    <div className="flex-1 space-y-4 w-full min-w-0">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit-first-name">First name</Label>
                                <Input
                                    id="edit-first-name"
                                    value={firstName}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        patchForm({ firstName: value });
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
                                        patchForm({ lastName: value });
                                        setLastNameProfanity(matcher.getAllMatches(value).length > 0);
                                    }}
                                    placeholder="Last name"
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-username">Username *</Label>
                            <Input
                                id="edit-username"
                                value={userName}
                                onChange={(e) => {
                                    const value = e.target.value.toLowerCase();
                                    patchForm({ userName: value });
                                    setUsernameProfanity(matcher.getAllMatches(value).length > 0);
                                    setUsernameTakenError(false);
                                }}
                                placeholder="Username"
                                className={cn(
                                    "w-full lowercase",
                                    usernameTakenError && "border-destructive focus-visible:ring-destructive"
                                )}
                                aria-invalid={usernameTakenError}
                            />
                            {usernameTakenError && (
                                <p className="text-sm text-destructive font-medium">
                                    This username is already taken.
                                </p>
                            )}
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
                            patchForm({ bio: value });
                            setBioProfanity(matcher.getAllMatches(value).length > 0);
                        }}
                        placeholder="A short bio"
                        className="min-h-[120px] w-full resize-y"
                        maxLength={250}
                    />
                </div>
            </div>
            <div className="flex flex-col items-stretch gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
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
            </div>
        </form>
    );
}

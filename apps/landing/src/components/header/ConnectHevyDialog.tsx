/*
 * @module ConnectHevyDialog
 * @description Header-level dialog for connecting or updating a user's Hevy API key so Proxima can sync workout data from the Hevy app.
 * @dependsOn UI dialog primitives, user context, Hevy API helpers, React Query for cache invalidation, and toast notifications.
 * @usedBy Navbar account menu to let authenticated users manage their Hevy integration.
 */

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState } from "react";
import { connectHevyKey, HEVY_API_KEY_SAVED_MESSAGE } from "../program-builder/api/connect-hevy-key";
import { triggerWorkoutHistorySync } from "@/api/workout-history-sync";
import { triggerBodyMeasurementsSync } from "@/api/body-measurements-sync";
import { useUserContext } from "@/contexts/UserContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useHevySecret } from "@/api/hooks";
import { LockIcon, LockOpenIcon } from "lucide-react";

/**
 * Props for `ConnectHevyDialog`.
 * @property openConnectHevyDialog Controls whether the dialog is visible.
 * @property handleOpenConnectHevyDialog Callback invoked when the dialog open state changes.
 */
interface IProps {
    openConnectHevyDialog: boolean;
    handleOpenConnectHevyDialog: (openConnectHevyDialog: boolean) => void;
}

/**
 * ConnectHevyDialog renders a controlled modal for entering, validating, and saving a user's Hevy API key.
 */
export const ConnectHevyDialog: React.FC<IProps> = (props) => {

    const {
        openConnectHevyDialog,
        handleOpenConnectHevyDialog,
    } = props;

    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);

    const [inputValue, setInputValue] = useState(hevyApiKey ?? "");
    const queryClient = useQueryClient();

    const isUpdate = Boolean(hevyApiKey && hevyApiKey.length > 0);

    // Validate the candidate API key and either update or create it, then refresh dependent queries.
    const handleConnectHevy = async () => {
        if (user === null) return;

        const result = await connectHevyKey({
            user,
            apiKey: inputValue,
            existingApiKey: hevyApiKey,
            queryClient,
        });

        if (result.status !== "saved") {
            toast.error(result.message);
            return;
        }

        toast.success(HEVY_API_KEY_SAVED_MESSAGE);
        triggerWorkoutHistorySync();
        triggerBodyMeasurementsSync();
        if (!isUpdate) {
            handleOpenConnectHevyDialog(false);
        }
    };
    return (
        <Dialog open={openConnectHevyDialog} onOpenChange={handleOpenConnectHevyDialog}>
            <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>
                        { hevyApiKey && hevyApiKey.length > 0 ?
                        <span className="text-lightSecondary flex justify-start items-center gap-2">
                            <LockIcon />
                            Update Hevy API Key
                        </span>
                        :
                        <span className="text-lightSecondary flex justify-start items-center gap-2">
                            <LockOpenIcon />
                            Connect Hevy App
                        </span> }
                    </DialogTitle>
                    <DialogDescription>
                        { hevyApiKey && hevyApiKey.length > 0 ?
                        "You are connected to your Hevy account" :
                        <span>Sync your data with your Proxima account by pasting your <a href="https://hevy.com/settings?developer" target="_blank" rel="noopener noreferrer" className="text-lightSecondary underline">API key</a> from yout Hevy account.</span>
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid flex-1 gap-2">
                    <Label htmlFor="api-key">
                        Paste Hevy API Key
                    </Label>
                    <Input
                        id="api-key"
                        type="text"
                        placeholder="5xxxxxxx-exxx-6xxx-sxxx-6xxxxxxxxxxx"
                        value={inputValue}
                        onInput={(e) => setInputValue(e.currentTarget.value)}
                        autoFocus
                    />
                </div>
                <DialogFooter className="sm:justify-start">
                    <Button className="bg-lightSecondary text-white" onClick={ handleConnectHevy }>{ hevyApiKey && hevyApiKey.length > 0 ? "Update" : "Connect" }</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState } from "react";
import { postHevyApikey, updateHevyApiKey } from "../program-builder/api/hevy";
import { useUserContext } from "@/contexts/UserContext";
import { toast } from "sonner";
import { validate } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { useHevySecret } from "@/api/hooks";
import { LockIcon, LockOpenIcon } from "lucide-react";

interface IProps {
    openConnectHevyDialog: boolean;
    handleOpenConnectHevyDialog: (openConnectHevyDialog: boolean) => void;
}

export const ConnectHevyDialog: React.FC<IProps> = (props) => {

    const {
        openConnectHevyDialog,
        handleOpenConnectHevyDialog,
    } = props;

    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);

    const [inputValue, setInputValue] = useState(hevyApiKey ?? "");
    const queryClient = useQueryClient();

    const handleConnectHevy = async () => {
        const isValidUuid = validate(inputValue);
        if (isValidUuid) {
            if (hevyApiKey && hevyApiKey.length > 0) {
                if ( user !== null ) {
                    const updatedApiKey = await updateHevyApiKey(user, inputValue);
                    if (updatedApiKey) {
                        toast.success("Hevy API Key saved successfully");
                        queryClient.invalidateQueries({ queryKey: [ "hevy_api_key" ] });
                        queryClient.invalidateQueries({ queryKey: ["exercise-stalls-analysis", user?.id] });
                    }
                }
            } else {
                if (user !== null) {
                    const newApiKey = await postHevyApikey(user,inputValue);
                    if (newApiKey && newApiKey.success) {
                        toast.success("Hevy API Key saved successfully");
                        queryClient.invalidateQueries({ queryKey: [ "hevy_api_key" ] });
                        queryClient.invalidateQueries({ queryKey: ["exercise-stalls-analysis", user?.id] });
                        handleOpenConnectHevyDialog(false);
                    } else {
                        toast.error(`Error saving Hevy API Key: ${ newApiKey && newApiKey?.data ? JSON.stringify(newApiKey.data) : "Unknown error" }`);
                    }
                }
            }
        } else {
            toast.error("Invalid Hevy API Key");
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
                        <span>Sync your data with your Proxima account by finding and pasting your <a href="https://hevy.com/settings?developer" target="_blank" rel="noopener noreferrer" className="text-lightSecondary underline">API key</a> from yout Hevy account on Desktop.</span>
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

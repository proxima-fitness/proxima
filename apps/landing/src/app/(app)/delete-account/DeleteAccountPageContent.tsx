"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteAccountDialog } from "@/components/header/DeleteAccountDialog";

/**
 * Client content for the delete-account page. Renders a CTA that opens the shared DeleteAccountDialog.
 */
export function DeleteAccountPageContent() {
    const [open, setOpen] = useState(false);
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
            <p className="text-muted-foreground text-center mb-4 max-w-md">
                Permanently remove your account and all associated data. This action cannot be undone.
            </p>
            <Button variant="destructive" onClick={() => setOpen(true)}>
                Delete my account
            </Button>
            <DeleteAccountDialog open={open} onOpenChange={setOpen} />
        </div>
    );
}

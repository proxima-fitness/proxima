"use client";

/**
 * @module TestUserTierToggle
 * For test users only: dropdown to override tier (Real/Free/Pro) for feature limits. Writes to
 * getTestTierOverride/setTestTierOverride and invalidates feature-limits queries.
 * Depends on: UserContext, featureLimits API, UI Select.
 * Used by: AppSidebar (when user is test user).
 */
import { useQueryClient } from "@tanstack/react-query";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUserContext } from "@/contexts/UserContext";
import {
    getTestTierOverride,
    isTestUser,
    setTestTierOverride,
    type TestTierOverride,
} from "@/api/featureLimits";
import { useState, useEffect } from "react";

type TierSelectValue = "real" | TestTierOverride;

/** No props. Renders nothing if user is not a test user; otherwise tier select. */
export function TestUserTierToggle() {
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const [value, setValue] = useState<TierSelectValue>(() => getTestTierOverride() ?? "real");

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(getTestTierOverride() ?? "real");
    }, [user?.id]);

    if (!user || !isTestUser(user)) return null;

    const handleChange = (next: TierSelectValue) => {
        setTestTierOverride(next === "real" ? null : next);
        setValue(next);
        queryClient.invalidateQueries({ queryKey: ["feature-limits", user.id] });
    };

    return (
        <div className="px-2 py-1.5">
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Test user</p>
            <Select
                value={value}
                onValueChange={(v) => handleChange(v as TierSelectValue)}
            >
                <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="real">Real</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

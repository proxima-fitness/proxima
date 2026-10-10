"use client";

/**
 * @module FullName
 * Fetches and displays a user's full name by program or user id; shows "Loading..." or "Anonymous" while loading or on error.
 * Depends on: useUserFullName from @/api/hooks.
 * Used by: program cards, profile, any place showing creator/user name.
 */
import { useUserFullName } from "@/api/hooks";

/** @property id - Program id or user id to resolve. */
/** @property id_type - Whether id refers to a "program" (author) or "user". */
interface IProps {
    id: number;
    id_type: "program" | "user";
}

/** Renders the resolved full name or loading/Anonymous fallback. */
export const FullName: React.FC<IProps> = (props) => {

    const {
        id,
        id_type,
    } = props;

    const { data: fullName, isLoading: loadingFullName, isError: errorFullName } = useUserFullName(id, id_type);

    if (loadingFullName) {
        return (
            <>Loading…</>
        );
    }

    if (errorFullName || !fullName) {
        return (
            <>Anonymous</>
        );
    }

    return (
        <>
            { fullName }
        </>
    );
};

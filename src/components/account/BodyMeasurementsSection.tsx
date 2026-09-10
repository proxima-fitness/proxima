"use client";

/**
 * @module account/BodyMeasurementsSection
 *
 * Read-only Body measurements subsection for Edit profile. Shows latest backup
 * entry + short history. Empty state points to Connect Hevy (no manual add).
 * Unmounted until SP10.
 *
 * Depends on: useLatestBodyMeasurement, useBodyMeasurementsHistory, useHevySecret,
 *             body-measurements-display, ConnectHevyDialog, PoundsOrKgContext
 * Used by: EditProfileContent (SP10)
 */

import { useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import {
    useBodyMeasurementsHistory,
    useHevySecret,
    useLatestBodyMeasurement,
} from "@/api/hooks";
import type { TBodyMeasurementRow } from "@/api/body-measurements-read";
import { ConnectHevyDialog } from "@/components/header/ConnectHevyDialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";

import {
    BODY_MEASUREMENTS_SECTION_HISTORY_LIMIT,
    buildBodyMeasurementDisplayRows,
    formatHistoryPreview,
    formatMeasuredOn,
} from "./body-measurements-display";

const INSET_GROUP_CLASS =
    "overflow-visible rounded-lg border border-border/60 bg-muted";

interface ISettingsGroupProps {
    caption: string;
    description?: string;
    children: ReactNode;
}

function SettingsGroup({ caption, description, children }: ISettingsGroupProps) {
    return (
        <div className="space-y-2">
            <div className="space-y-0.5 px-0.5">
                <p className="text-xs font-medium text-muted-foreground">{caption}</p>
                {description ? (
                    <p className="text-xs text-muted-foreground/80">{description}</p>
                ) : null}
            </div>
            <div className={INSET_GROUP_CLASS}>{children}</div>
        </div>
    );
}

function BodyMeasurementsEmptyState({ hevyConnected }: { hevyConnected: boolean }) {
    const [connectOpen, setConnectOpen] = useState(false);

    return (
        <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center"
            data-testid="body-measurements-empty-state"
        >
            <p className="text-sm font-medium text-foreground">No body measurements yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
                {hevyConnected
                    ? "Measurements sync from Hevy automatically. Log an entry in Hevy and they’ll show up here after the next sync."
                    : "Connect Hevy to back up body measurements. There’s no manual entry here."}
            </p>
            {hevyConnected ? null : (
                <>
                    <Button
                        type="button"
                        className="mt-2 rounded-full bg-lightSecondary px-4 text-sm text-white hover:bg-lightSecondary/90"
                        onClick={() => setConnectOpen(true)}
                    >
                        Connect Hevy
                    </Button>
                    <ConnectHevyDialog
                        openConnectHevyDialog={connectOpen}
                        handleOpenConnectHevyDialog={setConnectOpen}
                    />
                </>
            )}
        </div>
    );
}

function LatestMeasurementSummary({
    measurement,
    isInLbs,
}: {
    measurement: TBodyMeasurementRow;
    isInLbs: boolean;
}) {
    const rows = buildBodyMeasurementDisplayRows(measurement, isInLbs);

    return (
        <SettingsGroup
            caption="Latest"
            description={formatMeasuredOn(measurement.measured_on)}
        >
            {rows.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                    Entry on {formatMeasuredOn(measurement.measured_on)} has no metrics.
                </p>
            ) : (
                <div
                    className="divide-y divide-border/60"
                    data-testid="body-measurements-latest"
                >
                    {rows.map((row) => (
                        <div
                            key={row.label}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                            <span className="text-sm text-muted-foreground">{row.label}</span>
                            <span className="text-sm tabular-nums text-foreground">
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </SettingsGroup>
    );
}

function HistoryList({
    measurements,
    latestId,
    isInLbs,
}: {
    measurements: TBodyMeasurementRow[];
    latestId: string;
    isInLbs: boolean;
}) {
    const prior = measurements.filter((row) => row.id !== latestId);
    if (prior.length === 0) return null;

    return (
        <SettingsGroup caption="Recent history">
            <ul
                className="divide-y divide-border/60"
                data-testid="body-measurements-history"
            >
                {prior.map((row) => (
                    <li
                        key={row.id}
                        className="px-3 py-2.5 text-sm tabular-nums text-foreground"
                    >
                        {formatHistoryPreview(row, isInLbs)}
                    </li>
                ))}
            </ul>
        </SettingsGroup>
    );
}

export interface IBodyMeasurementsSectionProps {
    user: User;
}

/** Loads latest + short history; read-only (no Save). */
export function BodyMeasurementsSection({ user }: IBodyMeasurementsSectionProps) {
    const { isInLbs } = usePoundsOrKgContext();
    const { data: hevyApiKey, isLoading: isHevyLoading } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);

    const {
        data: latest,
        isLoading: isLatestLoading,
        isError: isLatestError,
    } = useLatestBodyMeasurement(user);

    const {
        data: historyPage,
        isLoading: isHistoryLoading,
        isError: isHistoryError,
    } = useBodyMeasurementsHistory(user, {
        limit: BODY_MEASUREMENTS_SECTION_HISTORY_LIMIT,
    });

    const isLoading = isHevyLoading || isLatestLoading || isHistoryLoading;

    if (isLoading) {
        return (
            <div className="flex min-h-32 items-center justify-center">
                <Spinner size="medium" />
            </div>
        );
    }

    if (isLatestError || isHistoryError) {
        return (
            <p className="text-sm text-destructive">
                Could not load body measurements. Try again later.
            </p>
        );
    }

    if (!latest) {
        return <BodyMeasurementsEmptyState hevyConnected={hevyConnected} />;
    }

    return (
        <div className="space-y-6" data-testid="body-measurements-section">
            <LatestMeasurementSummary measurement={latest} isInLbs={isInLbs} />
            <HistoryList
                measurements={historyPage?.measurements ?? []}
                latestId={latest.id}
                isInLbs={isInLbs}
            />
        </div>
    );
}

// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared empty-state and column render helpers for Hevy prescription grids (day card, PDF).
 */

import { formatWeight } from "@/lib/weightUtils";
import { cn } from "@/lib/utils";

/** Placeholder shown when a prescription field is intentionally unset. */
export const HEVY_PRESCRIPTION_EMPTY = "-";

export const repRangesEqual = (
    a: THevyRepRange | null | undefined,
    b: THevyRepRange | null | undefined,
): boolean => {
    if (a == null || b == null) {
        return a === b;
    }
    return a.start === b.start && a.end === b.end;
};

export const formatHevyRepRange = (rr: THevyRepRange): string => `${rr.start}-${rr.end}`;

export const setTypeBadgeClass = (setType: string): string =>
    setType === "warmup"
        ? "text-white bg-gray-300 px-1 rounded-sm"
        : setType === "dropset"
          ? "text-white bg-[#33bbcf] px-1 rounded-sm"
          : setType === "failure"
            ? "text-white bg-[#01579B] px-1 rounded-sm"
            : "";

export function HevyPrescriptionEmpty({
    className,
    selected,
}: TPrescriptionDisplayOptions & { className?: string }) {
    return (
        <div
            className={cn(
                "tabular-nums leading-none min-h-[1em]",
                selected ? "text-white/40" : "text-muted-foreground/50",
                className,
            )}
            aria-hidden
        >
            {HEVY_PRESCRIPTION_EMPTY}
        </div>
    );
}

/** One dash when every slot in a column is unprescribed (even if other columns use per-set rows). */
const renderColumnAllEmpty = (options?: TPrescriptionDisplayOptions) => (
    <HevyPrescriptionEmpty selected={options?.selected} />
);

export function renderSetsCount(
    sets: THevySets[] | undefined | null,
    options?: TPrescriptionDisplayOptions,
) {
    const safeSets = sets ?? [];
    if (safeSets.length === 0) {
        return <HevyPrescriptionEmpty selected={options?.selected} />;
    }
    return safeSets.length;
}

const repLabelForSet = (set: THevySets): string | null => {
    if (set.rep_range != null) {
        return formatHevyRepRange(set.rep_range);
    }
    if (set.reps !== null && set.reps > 0) {
        return String(set.reps);
    }
    return null;
};

const exerciseHasRepMetric = (sets: THevySets[]): boolean =>
    sets.some(
        (s) =>
            s.rep_range != null ||
            (s.reps !== null && s.reps > 0) ||
            (s.distance_meters !== null && s.distance_meters > 0) ||
            (s.duration_seconds !== null && s.duration_seconds > 0) ||
            (s.custom_metric !== null && s.custom_metric > 0),
    );

export function renderRepsColumn(
    sets: THevySets[] | undefined | null,
    options?: TPrescriptionDisplayOptions,
) {
    const selected = options?.selected;
    const safeSets = sets ?? [];
    if (safeSets.length === 0) {
        return <HevyPrescriptionEmpty selected={selected} />;
    }

    const first = safeSets[0];
    if (
        safeSets.some(
            (s) => s.rep_range != null || (s.reps !== null && s.reps > 0),
        )
    ) {
        const allSameType = safeSets.every((s) => s.type === first.type);
        const allRange =
            safeSets.every((s) => s.rep_range != null) &&
            safeSets.every((s) => repRangesEqual(s.rep_range, first.rep_range));
        const allFixed =
            safeSets.every((s) => s.rep_range == null) &&
            safeSets.every((s) => s.reps !== null && s.reps > 0) &&
            safeSets.every((s) => s.reps === first.reps);
        if (allSameType && (allRange || allFixed)) {
            const label =
                allRange && first.rep_range
                    ? formatHevyRepRange(first.rep_range)
                    : first.reps != null && first.reps > 0
                      ? String(first.reps)
                      : null;
            if (label == null) {
                return <HevyPrescriptionEmpty selected={selected} />;
            }
            return <div className="flex flex-row">{label}</div>;
        }
        const labels = safeSets.map(repLabelForSet);
        if (labels.every((label) => label == null)) {
            return renderColumnAllEmpty(options);
        }
        return safeSets.map((set, index) => {
            const label = labels[index];
            if (label == null) {
                return (
                    <HevyPrescriptionEmpty
                        key={index}
                        className={setTypeBadgeClass(set.type)}
                        selected={selected}
                    />
                );
            }
            return (
                <div key={index} className={`flex flex-row ${setTypeBadgeClass(set.type)}`}>
                    {label}
                </div>
            );
        });
    }

    if (safeSets[0] && safeSets[0].distance_meters !== null && safeSets[0].distance_meters > 0) {
        if (
            safeSets.every((s) => s.distance_meters === safeSets[0].distance_meters) &&
            safeSets.every((s) => s.type === safeSets[0].type)
        ) {
            return <div className="flex flex-row">{safeSets[0].distance_meters} m</div>;
        }
        if (safeSets.every((s) => s.distance_meters == null || s.distance_meters <= 0)) {
            return renderColumnAllEmpty(options);
        }
        return safeSets.map((set, index) => {
            if (set.distance_meters == null || set.distance_meters <= 0) {
                return (
                    <HevyPrescriptionEmpty
                        key={index}
                        className={setTypeBadgeClass(set.type)}
                        selected={selected}
                    />
                );
            }
            return (
                <div key={index} className={setTypeBadgeClass(set.type)}>
                    {set.distance_meters} m
                </div>
            );
        });
    }

    if (safeSets[0] && safeSets[0].duration_seconds !== null && safeSets[0].duration_seconds > 0) {
        if (
            safeSets.every((s) => s.duration_seconds === safeSets[0].duration_seconds) &&
            safeSets.every((s) => s.type === safeSets[0].type)
        ) {
            return <div className="flex flex-row">{safeSets[0].duration_seconds} s</div>;
        }
        if (safeSets.every((s) => s.duration_seconds == null || s.duration_seconds <= 0)) {
            return renderColumnAllEmpty(options);
        }
        return safeSets.map((set, index) => {
            if (set.duration_seconds == null || set.duration_seconds <= 0) {
                return (
                    <HevyPrescriptionEmpty
                        key={index}
                        className={setTypeBadgeClass(set.type)}
                        selected={selected}
                    />
                );
            }
            return (
                <div key={index} className={setTypeBadgeClass(set.type)}>
                    {set.duration_seconds} s
                </div>
            );
        });
    }

    if (safeSets[0] && safeSets[0].custom_metric !== null && safeSets[0].custom_metric > 0) {
        if (
            safeSets.every((s) => s.custom_metric === safeSets[0].custom_metric) &&
            safeSets.every((s) => s.type === safeSets[0].type)
        ) {
            return <div className="flex flex-row">{safeSets[0].custom_metric}</div>;
        }
        if (safeSets.every((s) => s.custom_metric == null || s.custom_metric <= 0)) {
            return renderColumnAllEmpty(options);
        }
        return safeSets.map((set, index) => {
            if (set.custom_metric == null || set.custom_metric <= 0) {
                return (
                    <HevyPrescriptionEmpty
                        key={index}
                        className={setTypeBadgeClass(set.type)}
                        selected={selected}
                    />
                );
            }
            return (
                <div key={index} className={setTypeBadgeClass(set.type)}>
                    {set.custom_metric}
                </div>
            );
        });
    }

    if (!exerciseHasRepMetric(safeSets)) {
        return renderColumnAllEmpty(options);
    }

    return <HevyPrescriptionEmpty selected={selected} />;
}

const weightDisplayValue = (set: THevySets, isInLbs: boolean): string | null => {
    if (set.weight_kg == null || set.weight_kg <= 0) {
        return null;
    }
    return formatWeight(set.weight_kg, isInLbs, "kg");
};

export function renderWeightColumn(
    sets: THevySets[] | undefined | null,
    isInLbs: boolean,
    options?: TPrescriptionDisplayOptions,
) {
    const selected = options?.selected;
    const safeSets = sets ?? [];
    if (safeSets.length === 0) {
        return <HevyPrescriptionEmpty selected={selected} />;
    }

    const values = safeSets.map((s) => weightDisplayValue(s, isInLbs));
    const prescribed = values.filter((v): v is string => v != null);
    if (prescribed.length === 0) {
        return renderColumnAllEmpty(options);
    }

    const firstVal = values[0];
    const allSame =
        firstVal != null && values.every((v) => v === firstVal);
    if (allSame) {
        return <div>{firstVal}</div>;
    }

    return safeSets.map((set, index) => {
        const value = values[index];
        if (value == null) {
            return (
                <HevyPrescriptionEmpty
                    key={index}
                    className={setTypeBadgeClass(set.type)}
                    selected={selected}
                />
            );
        }
        return (
            <div key={index} className={setTypeBadgeClass(set.type)}>
                {value}
            </div>
        );
    });
}

export function renderRpeColumn(
    sets: THevySets[] | undefined | null,
    options?: TPrescriptionDisplayOptions,
) {
    const selected = options?.selected;
    const safeSets = sets ?? [];
    if (safeSets.length === 0) {
        return <HevyPrescriptionEmpty selected={selected} />;
    }

    const rpeValues = safeSets.map((s) =>
        s.rpe != null && s.rpe > 0 ? s.rpe : null,
    );
    const prescribed = rpeValues.filter((v): v is number => v != null);
    if (prescribed.length === 0) {
        return renderColumnAllEmpty(options);
    }

    const firstRpe = rpeValues[0];
    const allSame =
        firstRpe != null && rpeValues.every((v) => v === firstRpe);
    if (allSame) {
        return <div>{firstRpe}</div>;
    }

    return safeSets.map((set, index) => {
        const value = rpeValues[index];
        if (value == null) {
            return (
                <HevyPrescriptionEmpty
                    key={index}
                    className={setTypeBadgeClass(set.type)}
                    selected={selected}
                />
            );
        }
        return (
            <div key={index} className={setTypeBadgeClass(set.type)}>
                {value}
            </div>
        );
    });
}

/** Muted style for empty prescription cells in @react-pdf/renderer output. */
export const PDF_PRESCRIPTION_EMPTY_STYLE = { color: "#9ca3af" };

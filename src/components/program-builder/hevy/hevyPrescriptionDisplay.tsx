/**
 * Shared empty-state and column render helpers for Hevy prescription grids (day card, PDF).
 */

import { formatWeight } from "@/lib/weightUtils";
import { cn } from "@/lib/utils";

/** Placeholder shown when a prescription field is intentionally unset. */
export const HEVY_PRESCRIPTION_EMPTY = "—";

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

type PrescriptionDisplayOptions = {
    selected?: boolean;
};

export function HevyPrescriptionEmpty({
    className,
    selected,
}: PrescriptionDisplayOptions & { className?: string }) {
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
const renderColumnAllEmpty = (options?: PrescriptionDisplayOptions) => (
    <HevyPrescriptionEmpty selected={options?.selected} />
);

export function renderSetsCount(sets: THevySets[], options?: PrescriptionDisplayOptions) {
    if (sets.length === 0) {
        return <HevyPrescriptionEmpty selected={options?.selected} />;
    }
    return sets.length;
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

export function renderRepsColumn(sets: THevySets[], options?: PrescriptionDisplayOptions) {
    const selected = options?.selected;
    if (sets.length === 0) {
        return <HevyPrescriptionEmpty selected={selected} />;
    }

    const first = sets[0];
    if (
        sets.some(
            (s) => s.rep_range != null || (s.reps !== null && s.reps > 0),
        )
    ) {
        const allSameType = sets.every((s) => s.type === first.type);
        const allRange =
            sets.every((s) => s.rep_range != null) &&
            sets.every((s) => repRangesEqual(s.rep_range, first.rep_range));
        const allFixed =
            sets.every((s) => s.rep_range == null) &&
            sets.every((s) => s.reps !== null && s.reps > 0) &&
            sets.every((s) => s.reps === first.reps);
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
        const labels = sets.map(repLabelForSet);
        if (labels.every((label) => label == null)) {
            return renderColumnAllEmpty(options);
        }
        return sets.map((set, index) => {
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

    if (sets[0] && sets[0].distance_meters !== null && sets[0].distance_meters > 0) {
        if (
            sets.every((s) => s.distance_meters === sets[0].distance_meters) &&
            sets.every((s) => s.type === sets[0].type)
        ) {
            return <div className="flex flex-row">{sets[0].distance_meters} m</div>;
        }
        if (sets.every((s) => s.distance_meters == null || s.distance_meters <= 0)) {
            return renderColumnAllEmpty(options);
        }
        return sets.map((set, index) => {
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

    if (sets[0] && sets[0].duration_seconds !== null && sets[0].duration_seconds > 0) {
        if (
            sets.every((s) => s.duration_seconds === sets[0].duration_seconds) &&
            sets.every((s) => s.type === sets[0].type)
        ) {
            return <div className="flex flex-row">{sets[0].duration_seconds} s</div>;
        }
        if (sets.every((s) => s.duration_seconds == null || s.duration_seconds <= 0)) {
            return renderColumnAllEmpty(options);
        }
        return sets.map((set, index) => {
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

    if (sets[0] && sets[0].custom_metric !== null && sets[0].custom_metric > 0) {
        if (
            sets.every((s) => s.custom_metric === sets[0].custom_metric) &&
            sets.every((s) => s.type === sets[0].type)
        ) {
            return <div className="flex flex-row">{sets[0].custom_metric}</div>;
        }
        if (sets.every((s) => s.custom_metric == null || s.custom_metric <= 0)) {
            return renderColumnAllEmpty(options);
        }
        return sets.map((set, index) => {
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

    if (!exerciseHasRepMetric(sets)) {
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
    sets: THevySets[],
    isInLbs: boolean,
    options?: PrescriptionDisplayOptions,
) {
    const selected = options?.selected;
    if (sets.length === 0) {
        return <HevyPrescriptionEmpty selected={selected} />;
    }

    const values = sets.map((s) => weightDisplayValue(s, isInLbs));
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

    return sets.map((set, index) => {
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

export function renderRpeColumn(sets: THevySets[], options?: PrescriptionDisplayOptions) {
    const selected = options?.selected;
    if (sets.length === 0) {
        return <HevyPrescriptionEmpty selected={selected} />;
    }

    const rpeValues = sets.map((s) =>
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

    return sets.map((set, index) => {
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

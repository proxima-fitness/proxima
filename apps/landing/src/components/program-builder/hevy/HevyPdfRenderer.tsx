// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module HevyPdfRenderer
 * Renders the Hevy program as a multi-page PDF document: title page (Proxima logo + slogan), then weeks as pages
 * with days as cards and exercises, then a thank-you page.
 * Uses @react-pdf/renderer; supports weight unit via PoundsOrKgContext or isInLbs prop.
 * Depends on: @react-pdf/renderer, formatWeight/getWeightUnit, shortEnglishHumanizer, Russo One font, proxima_logo_title asset.
 * Used by: ExportDialog (and optionally SaveDialog).
 */

import { shortEnglishHumanizer } from "@/assets/constants";
import { MAIN_DISCOUNT_CODE, MAIN_DISCOUNT_PERCENT } from "@/assets/constants/ui-constants";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { routineNotesForExport } from "@/lib/proximaExportAttribution";
import { formatWeight } from "@/lib/weightUtils";
import {
    HEVY_PRESCRIPTION_EMPTY,
    PDF_PRESCRIPTION_EMPTY_STYLE,
    formatHevyRepRange,
    repRangesEqual,
} from "./hevyPrescriptionDisplay";
import { Document, Font, Image, Page, Text, View } from "@react-pdf/renderer";
import { icon_background_white } from "public";

// Register the font
Font.register({
  family: 'Russo One',
  src: '/fonts/RussoOne-Regular.ttf',
});

/** Props for the PDF document. */
interface IProps {
    /** Program as weeks (outer array) and days per week (inner array). */
    hevyRoutine: THevyRoutine[][];
    /** Pass when rendering inside PDFViewer (no provider). Omit when under PoundsOrKgProvider. */
    isInLbs?: boolean;
}

/**
 * Renders a full program PDF: title page, one page per week with day cards and exercises, then thank-you page.
 */
export const HevyPdfRenderer: React.FC<IProps> = (props) => {

    const {
        hevyRoutine,
        isInLbs: isInLbsProp,
    } = props;

    const { isInLbs: contextIsInLbs } = usePoundsOrKgContext();
    const isInLbs = isInLbsProp ?? contextIsInLbs;

    const logoSrc = (icon_background_white as { src: string }).src;

    return (
        <Document>
            <Page
                orientation="landscape"
                size="A4"
                style={ {
                    padding: "24px",
                    height: "100%",
                    backgroundColor: "#FFFFFF",
                } }
            >
                <View
                    style={ {
                        height: "100%",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                    } }
                >
                    { /* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image is not a DOM img */ }
                    <Image
                        src={ logoSrc }
                        style={ { width: "320" } }
                    />
                    <View style={ { marginTop: "28px", alignItems: "center" } }>
                        <Text
                            style={ {
                                fontFamily: "Russo One",
                                fontSize: "28px",
                                textAlign: "center",
                                color: "#111827",
                            } }
                        >
                            Proxima Fitness
                        </Text>
                        <Text
                            style={ {
                                fontFamily: "Russo One",
                                fontSize: "24px",
                                textAlign: "center",
                                marginTop: "10px",
                                color: "#111827",
                            } }
                        >
                            Leave No Gains On The Table
                        </Text>
                    </View>
                </View>
            </Page>
            { hevyRoutine.map((week, index) => (
                <Page
                    key={ `Week ${index}` }
                    orientation="landscape"
                    size="A4"
                    style={ {
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        paddingBottom: "12px",
                        paddingTop: "12px",
                        height: "100%",
                        backgroundColor: "#FFFFFF",
                    } }
                >
                    <View
                        fixed
                        style={ {
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                        } }
                    >
                        <Text
                            style={ {
                                fontSize: "18px",
                                fontFamily: "Russo One",
                                textAlign: "left",
                            } }
                        >
                            Week {index + 1}
                        </Text>
                        <Text
                            style={ {
                                fontSize: "11px",
                                fontFamily: "Russo One",
                                color: "#6B7280",
                                paddingTop: "2px",
                            } }
                            render={({ subPageNumber }) => `Part ${subPageNumber}`}
                        />
                        <Text style={ { fontSize: "8px", fontFamily: "Russo One" } }>
                            © 2026 Proxima Fitness Inc.
                        </Text>
                        <View style={ { width: "100%", height: "58px" } } />
                    </View>
                    <View
                        style={ {
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "flex-start",
                            width: "100%",
                            paddingVertical: "8px",
                            gap: "16px",
                            flexWrap: "wrap",
                        } }
                    >
                        { week.map((day) => (
                            <View
                                wrap={false}
                                style={ {
                                    paddingHorizontal: "16px",
                                    paddingVertical: "8px",
                                    maxWidth: "250px",
                                    borderRadius: "8px",
                                    backgroundColor: "#F3F4F6",
                                } }
                                key={ "week " + ((day.folder_id ?? 0) + 1) + "day " + day.order + " " }
                            >
                                <View style={ { borderBottomWidth: "1px", borderColor: "#E5E7EB" } }>
                                    <Text style={ { fontSize: "12px", fontFamily: "Russo One" } }>
                                        { "Day" } { day.order } { day?.title ? <> &middot; { day.title }</> : "" }
                                    </Text>
                                    <Text style={ { fontWeight: "200", fontSize: "8px", paddingVertical: "4px" } }>
                                        { (day.exercises ?? []).length } {(day.exercises ?? []).length === 1 ? "Exercise" : `Exercises`}
                                    </Text>
                                    <Text
                                        style={ {
                                            fontWeight: "200",
                                            fontSize: "7px",
                                            paddingBottom: "4px",
                                            color: "#6B7280",
                                        } }
                                    >
                                        {routineNotesForExport(day.notes ?? "")}
                                    </Text>
                                </View>
                                <View style={ {
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    borderBottomWidth: "1px",
                                    borderColor: "#E5E7EB",
                                    fontSize: "8px",
                                    } }
                                >
                                    <View
                                        style={ {
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "flex-start",
                                            alignItems: "center",
                                            gap: "5px",
                                        } }
                                    >
                                        <View>
                                            <Text>#</Text>
                                        </View>
                                        <View>
                                            <Text>Exercise</Text>
                                        </View>
                                    </View>
                                    <View
                                        style={ {
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "flex-start",
                                            gap: "16px",
                                        } }
                                    >
                                        <View
                                            style={ {
                                                display: "flex",
                                                flexDirection: "row",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            } }
                                        >
                                            <Text>Sets</Text>
                                        </View>
                                        <View
                                            style={ {
                                                display: "flex",
                                                flexDirection: "row",
                                                justifyContent: "center",
                                                alignItems: "center",

                                            } }
                                        >
                                            <Text>Reps</Text>
                                        </View>
                                        <View
                                            style={ {
                                                display: "flex",
                                                flexDirection: "row",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            } }
                                        >
                                            <Text>{isInLbs ? "Lbs" : "Kg"}</Text>
                                        </View>
                                        <View
                                            style={ {
                                                display: "flex",
                                                flexDirection: "row",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            } }
                                        >
                                            <Text>RPE</Text>
                                        </View>
                                    </View>
                                </View>
                                <View>
                                    { day?.exercises?.map((exercise: THevyExercise, exerciseIndex: number) => {
                                        const sets = exercise.sets ?? [];
                                        return (
                                        <View key={ exerciseIndex }>
                                            <View
                                                style={ {
                                                    borderBottomWidth: "1px",
                                                    borderColor: "#E5E7EB",
                                                    fontSize: "8px",
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    fontWeight: "200",
                                                    alignItems: "center",
                                                    paddingVertical: "8px",
                                                } }
                                            >
                                                <View style={ {
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    justifyContent: "flex-start",
                                                    gap: "4px",
                                                    alignItems: "center",
                                                    maxWidth: "40%",
                                                } }>
                                                    <View>
                                                        <Text style={ { color: "#33BBCF" } }>{exerciseIndex + 1}</Text>
                                                    </View>
                                                    <View style={ { paddingRight: "2px" } }>
                                                        <Text>{ exercise?.title }</Text>
                                                    </View>
                                                    <View>
                                                    </View>
                                                </View>
                                                <View
                                                    style={ {
                                                        display: "flex",
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        width: "50%",
                                                        fontSize: "8px",
                                                    } }
                                                >
                                                    <Text
                                                        style={ { display: "flex", flexDirection: "column" } }
                                                    >
                                                        { sets.length > 0 ? (
                                                            sets.length
                                                        ) : (
                                                            <Text style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                {HEVY_PRESCRIPTION_EMPTY}
                                                            </Text>
                                                        ) }
                                                    </Text>
                                                    <Text>
                                                        { sets[0] &&
                                                            sets.some(
                                                                (s) =>
                                                                    s.rep_range != null ||
                                                                    (s.reps !== null && s.reps > 0),
                                                            ) &&
                                                            (() => {
                                                                const first = sets[0];
                                                                const allSameType = sets.every((s) => s.type === first.type);
                                                                const allRange =
                                                                    sets.every((s) => s.rep_range != null) &&
                                                                    sets.every((s) => repRangesEqual(s.rep_range, first.rep_range));
                                                                const allFixed =
                                                                    sets.every((s) => s.rep_range == null) &&
                                                                    sets.every((s) => s.reps !== null && s.reps > 0) &&
                                                                    sets.every((s) => s.reps === first.reps);
                                                                if (allSameType && (allRange || allFixed)) {
                                                                    return (
                                                                        <Text>
                                                                            {allRange && first.rep_range
                                                                                ? formatHevyRepRange(first.rep_range)
                                                                                : first.reps}
                                                                        </Text>
                                                                    );
                                                                }
                                                                const labels = sets.map((set) =>
                                                                    set.rep_range != null
                                                                        ? formatHevyRepRange(set.rep_range)
                                                                        : set.reps !== null && set.reps > 0
                                                                          ? String(set.reps)
                                                                          : null,
                                                                );
                                                                if (labels.every((label) => label == null)) {
                                                                    return (
                                                                        <Text style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                            {HEVY_PRESCRIPTION_EMPTY}
                                                                        </Text>
                                                                    );
                                                                }
                                                                return sets.map((set, index) => {
                                                                    const label = labels[index];
                                                                    if (label == null) {
                                                                        return (
                                                                            <Text key={ index } style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                                {HEVY_PRESCRIPTION_EMPTY}
                                                                            </Text>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <Text
                                                                            key={ index }
                                                                            style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }
                                                                        >
                                                                            {label}
                                                                        </Text>
                                                                    );
                                                                });
                                                            })()}
                                                        { sets.length > 0 &&
                                                            !sets.some(
                                                                (s) =>
                                                                    s.rep_range != null ||
                                                                    (s.reps !== null && s.reps > 0) ||
                                                                    (s.distance_meters !== null && s.distance_meters > 0) ||
                                                                    (s.duration_seconds !== null && s.duration_seconds > 0) ||
                                                                    (s.custom_metric !== null && s.custom_metric > 0),
                                                            ) && (
                                                                <Text style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                    {HEVY_PRESCRIPTION_EMPTY}
                                                                </Text>
                                                            ) }
                                                        { sets[0] && sets[0].distance_meters !== null && sets[0].distance_meters > 0 && (
                                                                sets.every((reps, i, arr) => reps.distance_meters === arr[0].distance_meters) ? (
                                                                    <Text>{sets[0].distance_meters} m</Text>
                                                                ) : (
                                                                    sets.map((set, index) => (
                                                                        <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.distance_meters } m</Text>
                                                                    ))
                                                                )
                                                            )}
                                                        { sets[0] && sets[0].duration_seconds !== null && sets[0].duration_seconds > 0 && (
                                                                sets.every((reps, i, arr) => reps.duration_seconds === arr[0].duration_seconds) ? (
                                                                    <Text>{shortEnglishHumanizer(sets[0].duration_seconds * 1000)} s</Text>
                                                                ) : (
                                                                    sets.map((set, index) => (
                                                                        <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.duration_seconds !== null && shortEnglishHumanizer(set.duration_seconds * 1000) } s</Text>
                                                                    ))
                                                                )
                                                            )}
                                                        { sets[0] && sets[0].custom_metric !== null && sets[0].custom_metric > 0 && (
                                                                sets.every((reps, i, arr) => reps.custom_metric === arr[0].custom_metric) ? (
                                                                    <Text>{sets[0].custom_metric}</Text>
                                                                ) : (
                                                                    sets.map((set, index) => (
                                                                        <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.custom_metric }</Text>
                                                                    ))
                                                                )
                                                            )}
                                                    </Text>
                                                    <Text style={ { display: "flex", flexDirection: "column" } }>
                                                        { (() => {
                                                            const weightValues = sets.map((set) =>
                                                                set.weight_kg != null && set.weight_kg > 0
                                                                    ? formatWeight(set.weight_kg, isInLbs, "kg")
                                                                    : null,
                                                            );
                                                            const prescribed = weightValues.filter((v): v is string => v != null);
                                                            if (prescribed.length === 0) {
                                                                return (
                                                                    <Text style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                        {HEVY_PRESCRIPTION_EMPTY}
                                                                    </Text>
                                                                );
                                                            }
                                                            const firstVal = weightValues[0];
                                                            if (firstVal != null && weightValues.every((v) => v === firstVal)) {
                                                                return <Text>{firstVal}</Text>;
                                                            }
                                                            return sets.map((set, index) => {
                                                                const value = weightValues[index];
                                                                if (value == null) {
                                                                    return (
                                                                        <Text key={ index } style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                            {HEVY_PRESCRIPTION_EMPTY}
                                                                        </Text>
                                                                    );
                                                                }
                                                                return (
                                                                    <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ value }</Text>
                                                                );
                                                            });
                                                        })() }
                                                    </Text>
                                                    <Text style={ { display: "flex", flexDirection: "column" } }>
                                                        { (() => {
                                                            const rpeValues = sets.map((s) =>
                                                                s.rpe != null && s.rpe > 0 ? s.rpe : null,
                                                            );
                                                            const prescribed = rpeValues.filter((v): v is number => v != null);
                                                            if (prescribed.length === 0) {
                                                                return (
                                                                    <Text style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                        {HEVY_PRESCRIPTION_EMPTY}
                                                                    </Text>
                                                                );
                                                            }
                                                            const firstRpe = rpeValues[0];
                                                            if (firstRpe != null && rpeValues.every((v) => v === firstRpe)) {
                                                                return <Text>{firstRpe} RPE</Text>;
                                                            }
                                                            return sets.map((set, index) => {
                                                                const value = rpeValues[index];
                                                                if (value == null) {
                                                                    return (
                                                                        <Text key={ index } style={ PDF_PRESCRIPTION_EMPTY_STYLE }>
                                                                            {HEVY_PRESCRIPTION_EMPTY}
                                                                        </Text>
                                                                    );
                                                                }
                                                                return (
                                                                    <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ value } RPE</Text>
                                                                );
                                                            });
                                                        })() }
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                    }) }
                                </View>
                            </View>
                        ))}
                    </View>
                </Page>
            ))}
            <Page style={ {
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "10px",
            } }>
                <View style={ { width: "80vw"} }>
                    <Text style={ { textAlign: "center", fontSize: "14px", fontWeight: "bold", paddingBottom: "8px" } }>Thank you for using the AI Program Builder!</Text>
                    <Text style={ { paddingVertical: "4px" } }>I hope this custom workout program helps you make the gains you were after. Respect for putting in the work!</Text>
                    <Text style={ { paddingVertical: "4px" } }>As a special thank you, enjoy {MAIN_DISCOUNT_PERCENT}% off your first year on Pro+ - agentic workout programming.</Text>
                    <Text style={ { paddingVertical: "4px" } }>Your program will be saved to your Proxima Fitness account in case you want to come back and edit it.</Text>
                    <Text style={ { paddingVertical: "4px", fontWeight: "bold" } }>Use code: {MAIN_DISCOUNT_CODE} for {MAIN_DISCOUNT_PERCENT}% off your first year on Pro+</Text>
                    <Text style={ { paddingVertical: "4px" } }>Subscribe at https://proximafitness.com and leave no gains on the table!</Text>
                    <View style={ { paddingVertical: "4px", display: "flex", flexDirection: "column", gap: "4px" } }>
                        <Text>Jack</Text>
                        <Text>Founder,</Text>
                        <Text>Proxima Fitness Inc.</Text>
                    </View>
                    <Text style={ { paddingVertical: "4px" } }>proximafitness.com</Text>
                </View>
            </Page>
        </Document>
    );
};

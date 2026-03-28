"use client";

/**
 * @module HevyPdfRenderer
 * Renders the Hevy program as a multi-page PDF document (weeks as pages, days as cards with exercises).
 * Uses @react-pdf/renderer; supports weight unit via PoundsOrKgContext or isInLbs prop. Ends with a thank-you page.
 * Depends on: @react-pdf/renderer, formatWeight/getWeightUnit, shortEnglishHumanizer, Russo One font.
 * Used by: ExportDialog (and optionally SaveDialog).
 */

import { shortEnglishHumanizer } from "@/assets/constants";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { routineNotesForExport } from "@/lib/proximaExportAttribution";
import { formatWeight, getWeightUnit } from "@/lib/weightUtils";
import { Page, Text, View, Document} from "@react-pdf/renderer";
import { Font } from '@react-pdf/renderer';

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
 * Renders a full program PDF: one page per week, day cards with exercises (sets/reps/intensity), then thank-you page.
 */
export const HevyPdfRenderer: React.FC<IProps> = (props) => {

    const {
        hevyRoutine,
        isInLbs: isInLbsProp,
    } = props;

    const { isInLbs: contextIsInLbs } = usePoundsOrKgContext();
    const isInLbs = isInLbsProp ?? contextIsInLbs;

    return (
        <Document>
            { hevyRoutine.map((week, index) => (
                <Page
                    key={ `Week ${index}` }
                    orientation="landscape"
                    size="A4"
                    style={ {
                        padding: "12px",
                        height: "100%",
                        backgroundColor: "#FFFFFF",
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
                    <Text style={ { fontSize: "8px", fontFamily: "Russo One"} }>© 2026 Proxima Fitness Inc.</Text>
                    <View
                        style={ {
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                            paddingVertical: "8px",
                            gap: "16px",
                            flexWrap: "wrap",
                        } }
                    >
                        { week.map((day) => (
                            <View
                                style={ {
                                    paddingHorizontal: "16px",
                                    paddingVertical: "8px",
                                    maxWidth: "250px",
                                    borderRadius: "8px",
                                    backgroundColor: "#F3F4F6",
                                } }
                                key={ "week " + (day.folder_id + 1) + "day " + day.order + " " }
                            >
                                <View style={ { borderBottomWidth: "1px", borderColor: "#E5E7EB" } }>
                                    <Text style={ { fontSize: "12px", fontFamily: "Russo One" } }>
                                        { "Day" } { day.order } { day?.title ? <> &middot; { day.title }</> : "" }
                                    </Text>
                                    <Text style={ { fontWeight: "200", fontSize: "8px", paddingVertical: "4px" } }>
                                        { day.exercises.length } {day.exercises.length === 1 ? "Exercise" : `Exercises`}
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
                                            <Text>Intensity</Text>
                                        </View>
                                    </View>
                                </View>
                                <View>
                                    { day?.exercises?.map((exercise: THevyExercise, exerciseIndex: number) => (
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
                                                        { exercise.sets.length }
                                                    </Text>
                                                    <Text>
                                                        { exercise.sets[0] && exercise.sets[0].reps !== null && exercise.sets[0].reps > 0 && (
                                                                exercise.sets.every((reps, i, arr) => reps.reps === arr[0].reps) ? (
                                                                    <Text>{exercise.sets[0].reps}</Text>
                                                                ) : (
                                                                    exercise.sets.map((set, index) => (
                                                                        <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.reps }</Text>
                                                                    ))
                                                                )
                                                            )}
                                                        { exercise.sets[0] && exercise.sets[0].distance_meters !== null && exercise.sets[0].distance_meters > 0 && (
                                                                exercise.sets.every((reps, i, arr) => reps.distance_meters === arr[0].distance_meters) ? (
                                                                    <Text>{exercise.sets[0].distance_meters} m</Text>
                                                                ) : (
                                                                    exercise.sets.map((set, index) => (
                                                                        <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.distance_meters } m</Text>
                                                                    ))
                                                                )
                                                            )}
                                                        { exercise.sets[0] && exercise.sets[0].duration_seconds !== null && exercise.sets[0].duration_seconds > 0 && (
                                                                exercise.sets.every((reps, i, arr) => reps.duration_seconds === arr[0].duration_seconds) ? (
                                                                    <Text>{shortEnglishHumanizer(exercise.sets[0].duration_seconds * 1000)} s</Text>
                                                                ) : (
                                                                    exercise.sets.map((set, index) => (
                                                                        <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.duration_seconds !== null && shortEnglishHumanizer(set.duration_seconds * 1000) } s</Text>
                                                                    ))
                                                                )
                                                            )}
                                                        { exercise.sets[0] && exercise.sets[0].custom_metric !== null && exercise.sets[0].custom_metric > 0 && (
                                                                exercise.sets.every((reps, i, arr) => reps.custom_metric === arr[0].custom_metric) ? (
                                                                    <Text>{exercise.sets[0].custom_metric}</Text>
                                                                ) : (
                                                                    exercise.sets.map((set, index) => (
                                                                        <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.custom_metric }</Text>
                                                                    ))
                                                                )
                                                            )}
                                                    </Text>
                                                    <Text style={ { display: "flex", flexDirection: "column" } }>
                                                        { exercise.sets[0] && exercise.sets[0].weight_kg !== null && exercise.sets[0].weight_kg > 0 && (
                                                            exercise.sets.every((intensity, i, arr) => intensity.weight_kg === arr[0].weight_kg) ? (
                                                                <Text>{formatWeight(exercise.sets[0].weight_kg, isInLbs, "kg")} {getWeightUnit(isInLbs)}</Text>
                                                            ) : (
                                                                exercise.sets.map((set, index) => (
                                                                    <Text key={ index } style={ { color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ formatWeight(set.weight_kg ?? 0, isInLbs, "kg") } {getWeightUnit(isInLbs)}</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise.sets.some((set) => set.rpe != null && set.rpe > 0) && (
                                                            (() => {
                                                                const rpeValues = exercise.sets.map((s) => s.rpe).filter((r): r is number => r != null && r > 0);
                                                                const allSameRpe = rpeValues.length > 0 && rpeValues.every((v) => v === rpeValues[0]);
                                                                return allSameRpe ? (
                                                                    <Text>{rpeValues[0]} RPE</Text>
                                                                ) : (
                                                                    exercise.sets.map((set, index) => (
                                                                        <Text key={ index } style={ { display: "flex", flexDirection: "column", color: set.type === "warmup" ? "#FFFFFF" : "#000000", backgroundColor: set.type === "warmup" ? "#cbd5e1" : "#f8f8f8", paddingHorizontal: "4px", borderRadius: "4px" } }>{ set.rpe != null && set.rpe > 0 ? `${set.rpe} RPE` : "" }</Text>
                                                                    ))
                                                                );
                                                            })()
                                                        )}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ) ) }
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
                    <Text style={ { paddingVertical: "4px" } }>As a special thank you, enjoy 30% off your first year of Proxima Fitness - agentic workout programming .</Text>
                    <Text style={ { paddingVertical: "4px" } }>Your program will be saved to your Proxima Fitness account in case you want to come back and edit it.</Text>
                    <Text style={ { paddingVertical: "4px", fontWeight: "bold" } }>Use code: HEVY30 at checkout</Text>
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

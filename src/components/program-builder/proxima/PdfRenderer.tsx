"use client";

import { shortEnglishHumanizer } from "@/assets/constants";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { formatWeight, getWeightUnit } from "@/lib/weightUtils";
import { Page, Text, View, Document} from "@react-pdf/renderer";
import { Font } from '@react-pdf/renderer';

// Register the font
Font.register({
  family: 'Russo One',
  src: '/fonts/RussoOne-Regular.ttf',
});


interface IProps {
    program: TScheduleWorkouts[][];
}

export const PdfRenderer: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const { isInLbs } = usePoundsOrKgContext();

    return (
        <Document>
            { program.map((week, index) => (
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
                    <Text style={ { fontSize: "8px", fontFamily: "Russo One"} }>© 2025 Proxima Fitness Inc.</Text>
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
                                key={ "week " + day.nthWeek + "day " + day.nthDay + " " }
                            >
                                <View style={ { borderBottomWidth: "1px", borderColor: "#E5E7EB" } }>
                                    <Text style={ { fontSize: "12px", fontFamily: "Russo One" } }>
                                        { "Day" } { day.nthDay } { day?.day_title ? <> &middot; { day.day_title }</> : "" }
                                    </Text>
                                    <Text style={ { fontWeight: "200", fontSize: "8px", paddingVertical: "4px" } }>
                                        { day.program_workout_exercises.length } {day.program_workout_exercises.length === 1 ? "Exercise" : `Exercises`}
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
                                    { day?.program_workout_exercises?.map((exercise: TSavedWorkoutExercise, exerciseIndex: number) => (
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
                                                        <Text>{ exercise?.hevy_exercise_templates?.title }</Text>
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
                                                        { exercise?.reps && (
                                                            exercise.reps.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.reps.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.reps.length || 0 }, (_, index) => (
                                                                    <Text key={ index }>{index + 1}</Text>
                                                                ))
                                                            )
                                                                    )}
                                                        { exercise?.reps_max && (
                                                            exercise.reps_max.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.reps_max.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.reps_max.length || 0 }, (_, index) => (
                                                                    <Text key={ index }>{index + 1}</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.time_taken && (
                                                            exercise.time_taken.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.time_taken.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.time_taken.length || 0 }, (_, index) => (
                                                                    <Text key={ index }>{index + 1}</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.amrap && (
                                                            exercise.amrap.every((reps, i, arr) => reps === arr[0]) ? (
                                                                `${exercise.amrap.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.amrap.length || 0 }, (_, index) => (
                                                                    <Text key={ index }>{index + 1}</Text>
                                                                ))
                                                            )
                                                            )}
                                                        { exercise?.time_range && (
                                                            exercise.time_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                `${exercise.time_range.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.time_range.length || 0 }, (_, index) => (
                                                                    <div key={ index }>{index + 1}</div>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.reps_range && (
                                                            exercise.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                `${exercise.reps_range.length}`
                                                            ) : (
                                                                Array.from({ length: exercise.reps_range.length || 0 }, (_, index) => (
                                                                    <Text key={ index }>{index + 1}</Text>
                                                                ))
                                                        ))}
                                                    </Text>
                                                    <Text>
                                                        { exercise?.amrap && "AMRAP" }
                                                        { exercise?.reps && (
                                                            exercise.reps.every((reps, i, arr) => reps === arr[0]) ? (
                                                                <Text>{exercise.reps[0]} Reps</Text>
                                                            ) : (
                                                                exercise.reps.map((repsNumber, index) => (
                                                                    <Text key={ index }>{ repsNumber } Reps</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.reps_max && (
                                                            exercise.reps_max.every((reps, i, arr) => reps === arr[0]) ? (
                                                                <Text>{">"} {exercise.reps_max[0]} Reps</Text>
                                                            ) : (
                                                                exercise.reps_max.map((repsNumber, index) => (
                                                                    <Text key={ index }>{">"} { repsNumber } Reps</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.reps_range && (
                                                            exercise.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                <Text>{ exercise.reps_range[0][0]}-{exercise.reps_range[0][1] } Reps</Text>
                                                            ) : (
                                                                exercise.reps_range.map((range, index) => (
                                                                    <Text key={ index }>{range[0]} - {range[1]} Reps</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.time_taken && (
                                                            exercise.time_taken.every((reps, i, arr) => reps === arr[0]) ? (
                                                                <Text>{shortEnglishHumanizer(exercise.time_taken[0] * 1000) }</Text>
                                                            ) : (
                                                                exercise.time_taken.map((repsNumber, index) => (
                                                                    <Text key={ index }>{shortEnglishHumanizer(repsNumber * 1000)}</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.time_range && (
                                                            exercise.time_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                <Text>{ exercise.time_range[0][0]}-{exercise.time_range[0][1] } Secs</Text>
                                                            ) : (
                                                                exercise.time_range.map((range, index) => (
                                                                    <Text key={ index }>{range[0]} - {range[1]} Secs</Text>
                                                                ))
                                                            )
                                                        )}
                                                    </Text>
                                                    <Text>
                                                        { exercise?.percent_rm && (
                                                            exercise.percent_rm.every((perVal, i, arr) => perVal === arr[0]) ? (
                                                                <Text>{exercise.percent_rm[0]} %1RM</Text>
                                                            ) : (
                                                                exercise.percent_rm.map((perVal, index) => (
                                                                    <Text key={ index }>{perVal} %1RM</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.rpe && (
                                                            exercise.rpe.every((rpeVal, i, arr) => rpeVal === arr[0]) ? (
                                                                <Text>{exercise.rpe[0]} RPE</Text>
                                                            ) : (
                                                                exercise.rpe.map((rpeVal, index) => (
                                                                    <Text key={ index }>{rpeVal} RPE</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.weights && (
                                                            exercise.weights.every((weightVal, i, arr) => weightVal === arr[0]) ? (
                                                                <Text>{formatWeight(exercise.weights[0], isInLbs, "lbs")} {getWeightUnit(isInLbs)}</Text>
                                                            ) : (
                                                                exercise.weights.map((weightVal, index) => (
                                                                    <Text key={ index }>{ formatWeight(weightVal, isInLbs, "lbs") } {getWeightUnit(isInLbs)}</Text>
                                                                ))
                                                            )
                                                        )}
                                                        { exercise?.rpe_range && (
                                                            exercise.rpe_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                                                <Text>{ exercise.rpe_range[0][0]}-{exercise.rpe_range[0][1] } RPE</Text>
                                                            ) : (
                                                                exercise.rpe_range.map((range, index) => (
                                                                    <Text key={ index }>{range[0]} - {range[1]} RPE</Text>
                                                                ))
                                                            )
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
                    <Text style={ { paddingVertical: "4px" } }>I hope this custom workout program helps you make the gains you were after. Respect for putting in the work, now it&apos;s time to level up!</Text>
                    <Text style={ { paddingVertical: "4px" } }>As a special thank you, enjoy 30% off your purchase on the Proxima Fitness App - the ultimate tool for AI-powered workout programming and tracking.</Text>
                    <Text style={ { paddingVertical: "4px" } }>You can also use your program for FREE in the Proxima Fitness App.</Text>
                    <Text style={ { paddingVertical: "4px", fontWeight: "bold" } }>Use code: GAINS30 at checkout</Text>
                    <Text style={ { paddingVertical: "4px" } }>Download the app and leave no gains on the table!</Text>
                    <Text style={ { paddingVertical: "4px" } }>Keep pushing forward, and happy training!</Text>
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

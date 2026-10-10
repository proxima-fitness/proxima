// SPDX-License-Identifier: AGPL-3.0-only

import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { ResponseFormatJSONSchema } from "https://deno.land/x/openai@v4.69.0/resources/shared.ts";
import { corsHeaders } from '../_shared/cors.ts';

type SchemaType =
    "workout_history_schema" | // Schema for in app workout history
    "program_creator_day_schema" | // Schema for in app program creator day
    "saved_workout_schema" | // schema for in app 1 workout
    "one_day_schema" | // Schema for 1 Workout
    "ppl_schema" | // Schema for Push, Pull, Legs Split
    "ul_schema" | // Schema for Upper Lower Split
    "cblsa_schema" | // Schema for Chest, Back, Legs, Shoulders, Arms Split
    "pplc_schema" | // Schema for Push, Pull, Legs, Cardio Split
    "hevy_routine_schema"; // deprecated

const schemas: Record<SchemaType, { type: string; json_schema: any }> =  {
  hevy_routine_schema: {
    type: "json_schema",
    json_schema: {
      name: "hevy_routine_schema",
      schema: {
        type: "object",
        properties: {
          routine: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              folder_id: { type: "number" },
              updated_at: { type: "string", format: "date-time" },
              created_at: { type: "string", format: "date-time" },
              order: { type: "string" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    title: { type: "string" },
                    notes: { type: "string" },
                    exercise_template_id: { type: "string" },
                    supersets_id: {
                      anyOf: [
                        { type: "integer" },
                        { type: "null" },
                      ],
                    },
                    sets: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "integer" },
                          type: { type: "string" },
                          weight_kg: { type: "number" },
                          reps: { type: "integer", minimum: 1 },
                          distance_meters: { type: "number" },
                          duration_seconds: { type: "number" },
                          rpe: { type: "number" },
                          custom_metric: { type: "number" },
                        },
                        required: [
                          "index",
                          "type",
                          "weight_kg",
                          "reps",
                          "distance_meters",
                          "duration_seconds",
                          "rpe",
                          "custom_metric",
                        ],
                      },
                    },
                  },
                  required: [
                    "index",
                    "title",
                    "notes",
                    "exercise_template_id",
                    "supersets_id",
                    "sets",
                  ],
                },
              },
            },
            required: [
              "id",
              "title",
              "folder_id",
              "exercises",
              "updated_at",
              "created_at",
            ],
            additionalProperties: false,
          },
        },
        required: ["routine"],
      },
    },
  },
  workout_history_schema: {
    type: "json_schema",
    json_schema: {
        name: "workout_history_schema",
        schema: {
            type: "object",
            properties: {
                id: { type: "string" },
                workout_name: { type: "string" },
                created_at: { type: "string", format: "date-time" },
                workout_history_exercises: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            created_at: { type: "string", format: "date-time" },
                            reps: {
                                type: "array",
                                items: { type: "integer", minimum: 1 },
                            },
                            weights: {
                                type: "array",
                                items: { type: "number" },
                            },
                            workout_history_id: { type: "string" },
                            exercises: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    gif_id: { type: "string" },
                                    instructions: {
                                        type: "array",
                                        items: { type: "string" },
                                    },
                                    name_english: { type: "string" },
                                    name_espanol: { type: "string" },
                                    name_portugues: { type: "string" },
                                    name_francais: { type: "string" },
                                },
                                required: [
                                    "id",
                                    "gif_id",
                                    "instructions",
                                    "name_english",
                                    "name_espanol",
                                    "name_portugues",
                                    "name_francais",
                                ],
                            },
                        },
                        required: [
                            "created_at",
                            "reps",
                            "weights",
                            "workout_history_id",
                            "exercises",
                        ],
                    },
                },
            },
            required: [
                "id",
                "workout_name",
                "created_at",
                "workout_history_exercises",
            ],
            additionalProperties: false,
        },
    },
  },
  program_creator_day_schema: {
    type: "json_schema",
    json_schema: {
      name: "program_creator_day_schema",
      schema: {
        type: "object",
        properties: {
          order: { type: "string" },
          day_title: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exercise: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    gif_id: { type: "string" },
                    instructions: {
                      type: "array",
                      items: { type: "string" },
                    },
                    name_english: { type: "string" },
                    name_espanol: { type: "string" },
                    name_portugues: { type: "string" },
                    name_francais: { type: "string" },
                  },
                  required: [
                    "id",
                    "name_english",
                    "name_espanol",
                    "name_portugues",
                    "name_francais",
                  ],
                },
                sets: { type: "number" },
                reps_type: {
                  type: "object",
                  properties: {
                    reps: {
                      type: "array",
                      items: { type: "number", minimum: 1 },
                    },
                    reps_range: {
                      type: "array",
                      items: {
                        type: "array",
                        items: { type: "number" },
                      },
                    },
                    reps_max: {
                      type: "array",
                      items: { type: "number" },
                    },
                    amrap: {
                      type: "array",
                      items: { type: "string" },
                    },
                    time_taken: {
                      type: "array",
                      items: { type: "number" },
                    },
                    time_range: {
                      type: "array",
                      items: {
                        type: "array",
                        items: { type: "number" },
                      },
                    },
                  },
                },
                intensity: {
                  type: "object",
                  properties: {
                    rpe: {
                      type: "array",
                      items: { type: "number" },
                    },
                    rpe_range: {
                      type: "array",
                      items: {
                        type: "array",
                        items: { type: "number" },
                      },
                    },
                    percent_rm: {
                      type: "array",
                      items: { type: "number" },
                    },
                    weights: {
                      type: "array",
                      items: { type: "number" },
                    },
                  },
                },
              },
            },
          },
          weekOrder: { type: "string" },
          id: { type: "string" },
        },
        required: ["order"],
        additionalProperties: false,
      },
    },
  },
  saved_workout_schema : {
        type: "json_schema",
        json_schema: {
        name: "saved_workout_schema",
        schema: {
            type: "object",
            properties: {
            id: { type: "string" },
            workout_name: { type: "string" },
            saved_workout_exercises: {
                type: "array",
                items: {
                type: "object",
                properties: {
                    reps: { type: "array", items: { type: "integer", minimum: 1 } },
                    reps_max: { type: "array", items: { type: "integer" } },
                    reps_range: { type: "array", items: { type: "array", items: { type: "integer" } } },
                    time_taken: { type: "array", items: { type: "integer" } },
                    time_range: { type: "array", items: { type: "array", items: { type: "integer" } } },
                    amrap: { type: "array", items: { type: "string" } },
                    rpe: { type: "array", items: { type: "integer" } },
                    rpe_range: { type: "array", items: { type: "array", items: { type: "integer" } } },
                    percent_rm: { type: "array", items: { type: "integer" } },
                    weights: { type: "array", items: { type: "integer" } },
                    exercises: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        gif_id: { type: "string" },
                        instructions: { type: "array", items: { type: "string" } },
                        name_english: { type: "string" },
                        name_espanol: { type: "string" },
                        name_portugues: { type: "string" },
                        name_francais: { type: "string" },
                    },
                    required: [
                        "id",
                        "name_english",
                        "name_espanol",
                        "name_portugues",
                        "name_francais",
                    ],
                    },
                },
                required: [
                    "reps",
                    "reps_max",
                    "reps_range",
                    "time_taken",
                    "time_range",
                    "amrap",
                    "rpe",
                    "rpe_range",
                    "percent_rm",
                    "weights",
                    "exercises",
                ],
                },
            },
            },
            required: ["workout_name"],
        },
    },
  },
  one_day_schema : {
    type: "json_schema",
    json_schema: {
        name: "one_day_schema",
        schema: {
            type: "object",
            properties: {
                workout_days: {
                    type: "array",
                    minItems: 1,
                    maxItems: 1,
                    description: "Workout Program Split",
                    items: {
                        type: "object",
                        properties: {
                            day_title: {
                                type: "string",
                                description: "The title of the day",
                            },
                            exercises: {
                                type: "array",
                                minItems: 4,
                                description: "A list of exercises for the workout",
                                items : {
                                    type: "object",
                                    properties: {
                                        title: {
                                          type: "string",
                                          description: "Name of the exercise."
                                        },
                                        supersets_id: {
                                          type: ["integer", "null"],
                                          description: "The id of the superset this exercise belongs to (0-indexed). Is null if not part of a superset."
                                        },
                                        sets: {
                                          type: "array",
                                          minItems: 3,
                                          description: "List of sets with type, reps, and rpe",
                                          items: {
                                            type: "object",
                                            properties: {
                                              type: {
                                                type: "string",
                                                enum: ["normal", "warmup", "dropset", "failure"],
                                                description: "Type of set (normal, warmup, dropset, failure)"
                                              },
                                              reps: {
                                                type: "integer",
                                                description: "Number of repetitions per set.",
                                                minimum: 1,
                                              },
                                              rpe: {
                                                type: "integer",
                                                description: "Rate of Perceived exertion (1-10)",
                                                minimum: 1,
                                                maximum: 10,
                                              },
                                            },
                                            required: ["type", "reps", "rpe"]
                                          }
                                        },
                                    },
                                    required: ["title", "sets", "reps", "rpe"],
                                },
                            },
                        },
                        required: ["day_title", "exercises"],
                    },
                },
            },
            required: ["workout_days"],
        },
    },
  },
  ppl_schema : {
    type: "json_schema",
    json_schema: {
        name: "ppl_schema",
        schema: {
            type: "object",
            properties: {
                workout_days: {
                    type: "array",
                    minItems: 3,
                    maxItems: 3,
                    description: "Workout Program Split",
                    items: {
                        type: "object",
                        properties: {
                            day_title: {
                                type: "string",
                                description: "The title of the day",
                            },
                            exercises: {
                                type: "array",
                                minItems: 4,
                                description: "A list of exercises for the workout",
                                items : {
                                    type: "object",
                                    properties: {
                                        title: {
                                          type: "string",
                                          description: "Name of the exercise."
                                        },
                                        supersets_id: {
                                          type: ["integer", "null"],
                                          description: "The id of the superset this exercise belongs to (0-indexed). Is null if not part of a superset."
                                        },
                                        sets: {
                                          type: "array",
                                          minItems: 3,
                                          description: "List of sets with type, reps, and rpe",
                                          items: {
                                            type: "object",
                                            properties: {
                                              type: {
                                                type: "string",
                                                enum: ["normal", "warmup", "dropset", "failure"],
                                                description: "Type of set (normal, warmup, dropset, failure)"
                                              },
                                              reps: {
                                                type: "integer",
                                                description: "Number of repetitions per set.",
                                                minimum: 1,
                                              },
                                              rpe: {
                                                type: "integer",
                                                description: "Rate of Perceived exertion (1-10)",
                                                minimum: 1,
                                                maximum: 10,
                                              } 
                                            }   
                                          },
                                          required: ["type", "reps", "rpe"]
                                        },
                                    },
                                    required: ["title", "sets", "reps", "rpe"],
                                },
                            },
                        },
                        required: ["day_title", "exercises"],
                    },
                },
            },
            required: ["workout_days"],
        },
    },
  },
  ul_schema : {
    type: "json_schema",
    json_schema: {
        name: "ul_schema",
        schema: {
            type: "object",
            properties: {
                workout_days: {
                    type: "array",
                    minItems: 2,
                    maxItems: 2,
                    description: "Workout Program Split",
                    items: {
                        type: "object",
                        properties: {
                            day_title: {
                                type: "string",
                                description: "The title of the day",
                            },
                            exercises: {
                                type: "array",
                                minItems: 4,
                                description: "A list of exercises for the workout",
                                items : {
                                    type: "object",
                                    properties: {
                                        title: {
                                          type: "string",
                                          description: "Name of the exercise."
                                        },
                                        supersets_id: {
                                          type: ["integer", "null"],
                                          description: "The id of the superset this exercise belongs to (0-indexed). Is null if not part of a superset."
                                        },
                                        sets: {
                                          type: "array",
                                          minItems: 3,
                                          description: "List of sets with type, reps, and rpe",
                                          items: {
                                            type: "object",
                                            properties: {
                                              type: {
                                                type: "string",
                                                enum: ["normal", "warmup", "dropset", "failure"],
                                                description: "Type of set (normal, warmup, dropset, failure)"
                                              },
                                              reps: {
                                                type: "integer",
                                                description: "Number of repetitions per set.",
                                                minimum: 1,
                                              },
                                              rpe: {
                                                type: "integer",
                                                description: "Rate of Perceived exertion (1-10)",
                                                minimum: 1,
                                                maximum: 10,
                                              }
                                            } 
                                          },
                                          required: ["type", "reps", "rpe"]
                                        },
                                    },
                                    required: ["title", "sets", "reps", "rpe"],
                                },
                            },
                        },
                        required: ["day_title", "exercises"],
                    },
                },
            },
            required: ["workout_days"],
        },
    },
  },
  cblsa_schema : {
    type: "json_schema",
    json_schema: {
        name: "ul_schema",
        schema: {
            type: "object",
            properties: {
                workout_days: {
                    type: "array",
                    minItems: 5,
                    maxItems: 5,
                    description: "Workout Program Split",
                    items: {
                        type: "object",
                        properties: {
                            day_title: {
                                type: "string",
                                description: "The title of the day",
                            },
                            exercises: {
                                type: "array",
                                minItems: 4,
                                description: "A list of exercises for the workout",
                                items : {
                                    type: "object",
                                    properties: {
                                        title: {
                                          type: "string",
                                          description: "Name of the exercise."
                                        },
                                        supersets_id: {
                                          type: ["integer", "null"],
                                          description: "The id of the superset this exercise belongs to (0-indexed). Is null if not part of a superset."
                                        },
                                        sets: {
                                          type: "array",
                                          minItems: 1,
                                          description: "List of sets with type, reps, and rpe",
                                          items: {
                                            type: "object",
                                            properties: {
                                              type: {
                                                type: "string",
                                                enum: ["normal", "warmup", "dropset", "failure"],
                                                description: "Type of set (normal, warmup, dropset, failure)"
                                              },
                                              reps: {
                                                type: "integer",
                                                description: "Number of repetitions per set.",
                                                minimum: 1,
                                              },
                                              rpe: {
                                                type: "integer",
                                                description: "Rate of Perceived exertion (1-10)",
                                                minimum: 1,
                                                maximum: 10,
                                              }
                                            } 
                                          },
                                          required: ["type", "reps", "rpe"]
                                        },  
                                    },
                                    required: ["title", "sets", "reps", "rpe"],
                                },
                            },
                        },
                        required: ["day_title", "exercises"],
                    },
                },
            },
            required: ["workout_days"],
        },
    },
  },
  pplc_schema : {
    type: "json_schema",
    json_schema: {
        name: "ul_schema",
        schema: {
            type: "object",
            properties: {
                workout_days: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    description: "Workout Program Split",
                    items: {
                        type: "object",
                        properties: {
                            day_title: {
                                type: "string",
                                description: "The title of the day",
                            },
                            exercises: {
                                type: "array",
                                minItems: 4,
                                description: "A list of exercises for the workout",
                                items : {
                                    type: "object",
                                    properties: {
                                        title: {
                                          type: "string",
                                          description: "Name of the exercise."
                                        },
                                        supersets_id: {
                                          type: ["integer", "null"],
                                          description: "The id of the superset this exercise belongs to (0-indexed). Is null if not part of a superset."
                                        },
                                        sets: {
                                          type: "array",
                                          minItems: 3,
                                          description: "List of sets with type, reps, and rpe",
                                          items: {
                                            type: "object",
                                            properties: {
                                              type: {
                                                type: "string",
                                                enum: ["normal", "warmup", "dropset", "failure"],
                                                description: "Type of set (normal, warmup, dropset, failure)"
                                              },
                                              reps: {
                                                type: "integer",
                                                description: "Number of repetitions per set.",
                                                minimum: 1,
                                              },
                                              rpe: {
                                                type: "integer",
                                                description: "Rate of Perceived exertion (1-10)",
                                                minimum: 1,
                                                maximum: 10,
                                              },
                                            }
                                          }
                                        },
                                        required: ["type", "reps", "rpe"]
                                    },
                                    required: ["title", "sets", "reps", "rpe"],
                                },
                            },
                        },
                        required: ["day_title", "exercises"],
                    },
                },
            },
            required: ["workout_days"],
        },
    },
  },
};

function getSystemPrompt(schema_type: SchemaType): string {
  switch (schema_type) {
      case "workout_history_schema":
          return "You are a fitness app AI assistant. Your task is to create a JSON structure for workout history (workout_history_schema), generate new workouts (saved_workout_schema), and design programs (program_details_schema). Follow the JSON format strictly.";
      case "saved_workout_schema":
          return "Create a new workout using the data provided. For each exercise, ONLY fill in the 'reps' and 'rpe' fields. Leave all other fields as null. MAKE SURE TO USE ONLY THE EXERCISES LISTED IN THE PROMPT.";
      case "program_creator_day_schema":
          return "Create a workout following the program_creator_day_schema based on the user's request. Format the output as valid JSON.";
      case "one_day_schema":
      case "ppl_schema":
      case "ul_schema":
      case "cblsa_schema":
      case "pplc_schema":
          return `You are a fitness AI assistant. Your task is to return the exercises for each requested workout day in valid JSON format.
                    RULES:
                    - Each exercise name MUST include the equipment used in parentheses at the end.
                    - Format: "Exercise Name (Equipment)"
                    - Examples: "Squat (Barbell)", "Incline Bench Press (Dumbbell)", "Push-Up (Bodyweight)"
                    - DO NOT OMIT the equipment.
                    - DO NOT invent new formatting.
                    - FOLLOW THE FORMAT EXACTLY.`;
      case "hevy_routine_schema":
          return "Create the specified workout day following the hevy_routine_schema. Ensure the output is valid JSON and respects the schema structure.";
      default:
          throw new Error(`Unhandled schema type: ${schema_type}`);
  }
}


serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, schemaType } = await req.json();

    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return new Response("Missing OpenAI API key", { status: 500, headers: corsHeaders });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    let chatCompletion;

    try {
        chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-2024-08-06", //"gpt-4o-mini",
            messages: [
                { role: "system", content: getSystemPrompt(schemaType as SchemaType) },
                { role: "user", content: query },
            ],
            response_format: schemas[schemaType as SchemaType] as ResponseFormatJSONSchema,
        });
    } catch (error: unknown) {
        console.error("OPENAI API ERROR",error);
        return new Response(JSON.stringify({ error: "Failed to fetch OpenAI response" }), { status: 500, headers: corsHeaders });
    }

    if (chatCompletion) {
        const reply = chatCompletion.choices[0].message.content;
        return new Response(JSON.stringify({ reply }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: `Internal Server Error ${error}` }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

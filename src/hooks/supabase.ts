export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_notes: {
        Row: {
          ai_schema: Json | null
          created_at: string
          id: string
          notes: string | null
          program_id: string | null
          saved_workout_id: string | null
          title: string | null
          user_id: string | null
          workout_history_id: string | null
        }
        Insert: {
          ai_schema?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          program_id?: string | null
          saved_workout_id?: string | null
          title?: string | null
          user_id?: string | null
          workout_history_id?: string | null
        }
        Update: {
          ai_schema?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          program_id?: string | null
          saved_workout_id?: string | null
          title?: string | null
          user_id?: string | null
          workout_history_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_notes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_notes_saved_workout_id_fkey"
            columns: ["saved_workout_id"]
            isOneToOne: false
            referencedRelation: "saved_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_notes_workout_history_id_fkey"
            columns: ["workout_history_id"]
            isOneToOne: false
            referencedRelation: "workout_history"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string | null
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          blocked_id?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          blocked_id?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_part: string | null
          created_at: string
          equipment: string[] | null
          gif_id: string | null
          id: string
          instructions: string[] | null
          name_english: string | null
          name_espanol: string | null
          name_francais: string | null
          name_portugues: string | null
          normalized_name_english: string | null
          secondary_muscles: string[] | null
          target_muscle: string | null
        }
        Insert: {
          body_part?: string | null
          created_at?: string
          equipment?: string[] | null
          gif_id?: string | null
          id: string
          instructions?: string[] | null
          name_english?: string | null
          name_espanol?: string | null
          name_francais?: string | null
          name_portugues?: string | null
          normalized_name_english?: string | null
          secondary_muscles?: string[] | null
          target_muscle?: string | null
        }
        Update: {
          body_part?: string | null
          created_at?: string
          equipment?: string[] | null
          gif_id?: string | null
          id?: string
          instructions?: string[] | null
          name_english?: string | null
          name_espanol?: string | null
          name_francais?: string | null
          name_portugues?: string | null
          normalized_name_english?: string | null
          secondary_muscles?: string[] | null
          target_muscle?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hevy_exercise_templates: {
        Row: {
          equipment: string | null
          id: string
          is_custom: boolean | null
          normalized_title: string | null
          primary_muscle_group: string | null
          secondary_muscle_groups: string[] | null
          title: string | null
          type: string | null
        }
        Insert: {
          equipment?: string | null
          id: string
          is_custom?: boolean | null
          normalized_title?: string | null
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[] | null
          title?: string | null
          type?: string | null
        }
        Update: {
          equipment?: string | null
          id?: string
          is_custom?: boolean | null
          normalized_title?: string | null
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[] | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      onboarding_emails: {
        Row: {
          behind_the_scenes_email: boolean | null
          created_at: string
          customer_stories_email: boolean | null
          feedback_email: boolean | null
          hevy_product_education_email: boolean | null
          id: string
          programs_product_education_email: boolean | null
          promotions_offers_email: boolean | null
          user_id: string | null
          value_add_content_email: boolean | null
          welcome_email: boolean | null
        }
        Insert: {
          behind_the_scenes_email?: boolean | null
          created_at?: string
          customer_stories_email?: boolean | null
          feedback_email?: boolean | null
          hevy_product_education_email?: boolean | null
          id?: string
          programs_product_education_email?: boolean | null
          promotions_offers_email?: boolean | null
          user_id?: string | null
          value_add_content_email?: boolean | null
          welcome_email?: boolean | null
        }
        Update: {
          behind_the_scenes_email?: boolean | null
          created_at?: string
          customer_stories_email?: boolean | null
          feedback_email?: boolean | null
          hevy_product_education_email?: boolean | null
          id?: string
          programs_product_education_email?: boolean | null
          promotions_offers_email?: boolean | null
          user_id?: string | null
          value_add_content_email?: boolean | null
          welcome_email?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_survey: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string
          days_per_week: number | null
          equipment: string | null
          fitness_level: string | null
          focus_areas: string[] | null
          gender: string | null
          goals: string[] | null
          health_issues: string[] | null
          height: number | null
          id: string
          motivations: string[] | null
          user_id: string | null
          workout_days: string[] | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          days_per_week?: number | null
          equipment?: string | null
          fitness_level?: string | null
          focus_areas?: string[] | null
          gender?: string | null
          goals?: string[] | null
          health_issues?: string[] | null
          height?: number | null
          id?: string
          motivations?: string[] | null
          user_id?: string | null
          workout_days?: string[] | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          days_per_week?: number | null
          equipment?: string | null
          fitness_level?: string | null
          focus_areas?: string[] | null
          gender?: string | null
          goals?: string[] | null
          health_issues?: string[] | null
          height?: number | null
          id?: string
          motivations?: string[] | null
          user_id?: string | null
          workout_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_survey_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          personalRecordMaxes: number[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id: string
          personalRecordMaxes?: number[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          personalRecordMaxes?: number[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      program_history: {
        Row: {
          created_at: string
          id: string
          program_id: string | null
          program_length: number | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id?: string | null
          program_length?: number | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string | null
          program_length?: number | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      program_schedule_history: {
        Row: {
          created_at: string
          id: string
          nthDay: number | null
          nthWeek: number | null
          program_history_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nthDay?: number | null
          nthWeek?: number | null
          program_history_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nthDay?: number | null
          nthWeek?: number | null
          program_history_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_schedule_history_program_history_id_fkey"
            columns: ["program_history_id"]
            isOneToOne: false
            referencedRelation: "program_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_schedule_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      program_subscribers: {
        Row: {
          created_at: string
          id: string
          program_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_subscribers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      program_workout_exercises: {
        Row: {
          amrap: string[] | null
          created_at: string
          exercise_id: string | null
          id: string
          percent_rm: number[] | null
          reps: number[] | null
          reps_max: number[] | null
          reps_range: number[] | null
          rpe: number[] | null
          rpe_range: number[] | null
          schedule_id: string | null
          set_types: string[] | null
          supersets_id: number | null
          time_range: number[] | null
          time_taken: number[] | null
          weights: number[] | null
        }
        Insert: {
          amrap?: string[] | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          percent_rm?: number[] | null
          reps?: number[] | null
          reps_max?: number[] | null
          reps_range?: number[] | null
          rpe?: number[] | null
          rpe_range?: number[] | null
          schedule_id?: string | null
          set_types?: string[] | null
          supersets_id?: number | null
          time_range?: number[] | null
          time_taken?: number[] | null
          weights?: number[] | null
        }
        Update: {
          amrap?: string[] | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          percent_rm?: number[] | null
          reps?: number[] | null
          reps_max?: number[] | null
          reps_range?: number[] | null
          rpe?: number[] | null
          rpe_range?: number[] | null
          schedule_id?: string | null
          set_types?: string[] | null
          supersets_id?: number | null
          time_range?: number[] | null
          time_taken?: number[] | null
          weights?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "program_workout_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workout_exercises_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      program_workout_exercises_history: {
        Row: {
          amrap: string[] | null
          created_at: string
          exercise_id: string | null
          id: string
          program_schedule_history_id: string | null
          reps: number[] | null
          rpe: number[] | null
          time_taken: number[] | null
          user_id: string | null
          weights: number[] | null
        }
        Insert: {
          amrap?: string[] | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          program_schedule_history_id?: string | null
          reps?: number[] | null
          rpe?: number[] | null
          time_taken?: number[] | null
          user_id?: string | null
          weights?: number[] | null
        }
        Update: {
          amrap?: string[] | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          program_schedule_history_id?: string | null
          reps?: number[] | null
          rpe?: number[] | null
          time_taken?: number[] | null
          user_id?: string | null
          weights?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "program_workout_exercises_hist_program_schedule_history_id_fkey"
            columns: ["program_schedule_history_id"]
            isOneToOne: false
            referencedRelation: "program_schedule_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workout_exercises_history_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workout_exercises_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          details: string | null
          difficulty: string[] | null
          equipment: string | null
          explore: boolean | null
          hevy_routines: Json | null
          id: string
          program_length: number | null
          programs_textsearchable_index_col: unknown | null
          prompt: string | null
          saves: number
          specialization: string[] | null
          title: string | null
          user_id: string | null
          workout_duration: number | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          difficulty?: string[] | null
          equipment?: string | null
          explore?: boolean | null
          hevy_routines?: Json | null
          id: string
          program_length?: number | null
          programs_textsearchable_index_col?: unknown | null
          prompt?: string | null
          saves?: number
          specialization?: string[] | null
          title?: string | null
          user_id?: string | null
          workout_duration?: number | null
        }
        Update: {
          created_at?: string
          details?: string | null
          difficulty?: string[] | null
          equipment?: string | null
          explore?: boolean | null
          hevy_routines?: Json | null
          id?: string
          program_length?: number | null
          programs_textsearchable_index_col?: unknown | null
          prompt?: string | null
          saves?: number
          specialization?: string[] | null
          title?: string | null
          user_id?: string | null
          workout_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          program_id: string | null
          reason: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_workout_exercises: {
        Row: {
          amrap: string[] | null
          created_at: string
          exercise_id: string | null
          id: string
          percent_rm: number[] | null
          reps: number[] | null
          reps_max: number[] | null
          reps_range: number[] | null
          rpe: number[] | null
          rpe_range: number[] | null
          saved_workout_id: string | null
          set_types: string[] | null
          supersets_id: number | null
          time_range: number[] | null
          time_taken: number[] | null
          weights: number[] | null
        }
        Insert: {
          amrap?: string[] | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          percent_rm?: number[] | null
          reps?: number[] | null
          reps_max?: number[] | null
          reps_range?: number[] | null
          rpe?: number[] | null
          rpe_range?: number[] | null
          saved_workout_id?: string | null
          set_types?: string[] | null
          supersets_id?: number | null
          time_range?: number[] | null
          time_taken?: number[] | null
          weights?: number[] | null
        }
        Update: {
          amrap?: string[] | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          percent_rm?: number[] | null
          reps?: number[] | null
          reps_max?: number[] | null
          reps_range?: number[] | null
          rpe?: number[] | null
          rpe_range?: number[] | null
          saved_workout_id?: string | null
          set_types?: string[] | null
          supersets_id?: number | null
          time_range?: number[] | null
          time_taken?: number[] | null
          weights?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_workout_exercises_saved_workout_id_fkey"
            columns: ["saved_workout_id"]
            isOneToOne: false
            referencedRelation: "saved_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_workouts: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
          workout_name: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          user_id?: string | null
          workout_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          workout_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_workouts: {
        Row: {
          created_at: string
          day_notes: string | null
          day_title: string | null
          id: string
          nthDay: number | null
          nthWeek: number | null
          program_id: string | null
        }
        Insert: {
          created_at?: string
          day_notes?: string | null
          day_title?: string | null
          id?: string
          nthDay?: number | null
          nthWeek?: number | null
          program_id?: string | null
        }
        Update: {
          created_at?: string
          day_notes?: string | null
          day_title?: string | null
          id?: string
          nthDay?: number | null
          nthWeek?: number | null
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      trending: {
        Row: {
          created_at: string
          id: string
          program_ids: string[] | null
          title_english: string | null
          title_espanol: string | null
          title_francais: string | null
          title_portugues: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_ids?: string[] | null
          title_english?: string | null
          title_espanol?: string | null
          title_francais?: string | null
          title_portugues?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_ids?: string[] | null
          title_english?: string | null
          title_espanol?: string | null
          title_francais?: string | null
          title_portugues?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          textsearchable_index_col: unknown | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          textsearchable_index_col?: unknown | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          textsearchable_index_col?: unknown | null
          username?: string | null
        }
        Relationships: []
      }
      workout_history: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
          workout_name: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          user_id?: string | null
          workout_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          workout_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_history_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          id: string
          reps: number[] | null
          user_id: string | null
          weights: number[] | null
          workout_history_id: string | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          reps?: number[] | null
          user_id?: string | null
          weights?: number[] | null
          workout_history_id?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          reps?: number[] | null
          user_id?: string | null
          weights?: number[] | null
          workout_history_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_history_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_history_exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_history_exercises_workout_history_id_fkey"
            columns: ["workout_history_id"]
            isOneToOne: false
            referencedRelation: "workout_history"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_secret: {
        Args: { secret_name: string }
        Returns: string
      }
      insert_secret: {
        Args:
          | { name: string; secret: string }
          | { name: string; secret: string; description: string }
          | { secret: string }
        Returns: string
      }
      read_secret: {
        Args: { secret_name: string }
        Returns: string
      }
      search_programs_by_prefix: {
        Args: { prefix: string }
        Returns: {
          created_at: string
          details: string | null
          difficulty: string[] | null
          equipment: string | null
          explore: boolean | null
          hevy_routines: Json | null
          id: string
          program_length: number | null
          programs_textsearchable_index_col: unknown | null
          prompt: string | null
          saves: number
          specialization: string[] | null
          title: string | null
          user_id: string | null
          workout_duration: number | null
        }[]
      }
      search_users_by_prefix: {
        Args: { prefix: string }
        Returns: {
          bio: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          textsearchable_index_col: unknown | null
          username: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {},
  },
} as const

/* eslint-disable @typescript-eslint/naming-convention */
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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      body_measurements: {
        Row: {
          abdomen: number | null
          chest_cm: number | null
          created_at: string
          external_id: string
          fat_percent: number | null
          hips: number | null
          id: string
          lean_mass_kg: number | null
          left_bicep_cm: number | null
          left_calf: number | null
          left_forearm_cm: number | null
          left_thigh: number | null
          measured_on: string
          neck_cm: number | null
          right_bicep_cm: number | null
          right_calf: number | null
          right_forearm_cm: number | null
          right_thigh: number | null
          shoulder_cm: number | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at: string
          user_id: string
          waist: number | null
          weight_kg: number | null
        }
        Insert: {
          abdomen?: number | null
          chest_cm?: number | null
          created_at?: string
          external_id: string
          fat_percent?: number | null
          hips?: number | null
          id?: string
          lean_mass_kg?: number | null
          left_bicep_cm?: number | null
          left_calf?: number | null
          left_forearm_cm?: number | null
          left_thigh?: number | null
          measured_on: string
          neck_cm?: number | null
          right_bicep_cm?: number | null
          right_calf?: number | null
          right_forearm_cm?: number | null
          right_thigh?: number | null
          shoulder_cm?: number | null
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          user_id: string
          waist?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdomen?: number | null
          chest_cm?: number | null
          created_at?: string
          external_id?: string
          fat_percent?: number | null
          hips?: number | null
          id?: string
          lean_mass_kg?: number | null
          left_bicep_cm?: number | null
          left_calf?: number | null
          left_forearm_cm?: number | null
          left_thigh?: number | null
          measured_on?: string
          neck_cm?: number | null
          right_bicep_cm?: number | null
          right_calf?: number | null
          right_forearm_cm?: number | null
          right_thigh?: number | null
          shoulder_cm?: number | null
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          user_id?: string
          waist?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_exercise_mappings: {
        Row: {
          canonical_exercise_id: string
          created_at: string
          external_exercise_id: string
          id: string
          source: Database["public"]["Enums"]["source_type"]
        }
        Insert: {
          canonical_exercise_id: string
          created_at?: string
          external_exercise_id: string
          id?: string
          source: Database["public"]["Enums"]["source_type"]
        }
        Update: {
          canonical_exercise_id?: string
          created_at?: string
          external_exercise_id?: string
          id?: string
          source?: Database["public"]["Enums"]["source_type"]
        }
        Relationships: []
      }
      canonical_exercises: {
        Row: {
          created_at: string
          equipment: string | null
          exercise_type: string | null
          id: string
          normalized_title: string
          primary_muscle_group: string | null
          secondary_muscle_groups: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          equipment?: string | null
          exercise_type?: string | null
          id?: string
          normalized_title: string
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          equipment?: string | null
          exercise_type?: string | null
          id?: string
          normalized_title?: string
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          conversation: Json[] | null
          created_at: string
          id: string
          pinned: boolean | null
          program_id: number | null
          title: string
          user_id: string
        }
        Insert: {
          conversation?: Json[] | null
          created_at?: string
          id?: string
          pinned?: boolean | null
          program_id?: number | null
          title: string
          user_id: string
        }
        Update: {
          conversation?: Json[] | null
          created_at?: string
          id?: string
          pinned?: boolean | null
          program_id?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage: {
        Row: {
          created_at: string
          id: string
          monthly_exports_used: number
          monthly_llm_requests: number
          period_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_exports_used?: number
          monthly_llm_requests?: number
          period_start?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_exports_used?: number
          monthly_llm_requests?: number
          period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage_pre_period_snapshot: {
        Row: {
          created_at: string | null
          id: string | null
          monthly_exports_used: number | null
          monthly_llm_requests: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          monthly_exports_used?: number | null
          monthly_llm_requests?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          monthly_exports_used?: number | null
          monthly_llm_requests?: number | null
          user_id?: string | null
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
      hevy_body_measurements_count: {
        Row: {
          created_at: string
          id: string
          last_known_measurement_count: number | null
          last_known_page_count: number | null
          last_synced_page: number | null
          sync_error: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_known_measurement_count?: number | null
          last_known_page_count?: number | null
          last_synced_page?: number | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_known_measurement_count?: number | null
          last_known_page_count?: number | null
          last_synced_page?: number | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hevy_body_measurements_count_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hevy_exercise_templates: {
        Row: {
          equipment: string | null
          gif_id: string | null
          id: string
          instructions: string[] | null
          is_custom: boolean | null
          normalized_title: string | null
          primary_muscle_group: string | null
          secondary_muscle_groups: string[] | null
          title: string | null
          type: string | null
        }
        Insert: {
          equipment?: string | null
          gif_id?: string | null
          id: string
          instructions?: string[] | null
          is_custom?: boolean | null
          normalized_title?: string | null
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[] | null
          title?: string | null
          type?: string | null
        }
        Update: {
          equipment?: string | null
          gif_id?: string | null
          id?: string
          instructions?: string[] | null
          is_custom?: boolean | null
          normalized_title?: string | null
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[] | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      hevy_workouts_count: {
        Row: {
          created_at: string
          id: string
          last_known_workout_count: number | null
          last_synced_page: number | null
          sync_error: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_known_workout_count?: number | null
          last_synced_page?: number | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_known_workout_count?: number | null
          last_synced_page?: number | null
          sync_error?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hevy_workouts_count_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          created_at: string
          document_type: string
          effective_at: string
          id: string
          version_label: string
        }
        Insert: {
          created_at?: string
          document_type: string
          effective_at: string
          id?: string
          version_label: string
        }
        Update: {
          created_at?: string
          document_type?: string
          effective_at?: string
          id?: string
          version_label?: string
        }
        Relationships: []
      }
      product_usage_limits: {
        Row: {
          created_at: string
          id: string
          max_monthly_exports: number | null
          max_monthly_llm_requests: number | null
          max_premium_llm_requests: number | null
          product_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_monthly_exports?: number | null
          max_monthly_llm_requests?: number | null
          max_premium_llm_requests?: number | null
          product_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_monthly_exports?: number | null
          max_monthly_llm_requests?: number | null
          max_premium_llm_requests?: number | null
          product_title?: string | null
        }
        Relationships: []
      }
      program_history: {
        Row: {
          created_at: string
          id: string
          program_id: number
          program_length: number | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: number
          program_length?: number | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: number
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
          program_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: number
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
          old_exercise_id: string | null
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
          old_exercise_id?: string | null
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
          old_exercise_id?: string | null
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
            foreignKeyName: "program_workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "hevy_exercise_templates"
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
          old_exercise_id: string | null
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
          old_exercise_id?: string | null
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
          old_exercise_id?: string | null
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
            referencedRelation: "hevy_exercise_templates"
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
          id: number
          is_coach: boolean | null
          lock: boolean | null
          program_length: number | null
          programs_textsearchable_index_col: unknown
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
          id?: number
          is_coach?: boolean | null
          lock?: boolean | null
          program_length?: number | null
          programs_textsearchable_index_col?: unknown
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
          id?: number
          is_coach?: boolean | null
          lock?: boolean | null
          program_length?: number | null
          programs_textsearchable_index_col?: unknown
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
          program_id: number
          reason: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: number
          reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: number
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
          old_exercise_id: string | null
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
          old_exercise_id?: string | null
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
          old_exercise_id?: string | null
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
            referencedRelation: "hevy_exercise_templates"
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
          program_id: number | null
        }
        Insert: {
          created_at?: string
          day_notes?: string | null
          day_title?: string | null
          id?: string
          nthDay?: number | null
          nthWeek?: number | null
          program_id?: number | null
        }
        Update: {
          created_at?: string
          day_notes?: string | null
          day_title?: string | null
          id?: string
          nthDay?: number | null
          nthWeek?: number | null
          program_id?: number | null
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
      session_episodes: {
        Row: {
          chat_id: string | null
          constraints_snapshot: Json
          created_at: string
          id: string
          key_decisions: Json
          program_id: number | null
          summary: string
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          constraints_snapshot?: Json
          created_at?: string
          id?: string
          key_decisions?: Json
          program_id?: number | null
          summary: string
          user_id: string
        }
        Update: {
          chat_id?: string | null
          constraints_snapshot?: Json
          created_at?: string
          id?: string
          key_decisions?: Json
          program_id?: number | null
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_episodes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_users: {
        Row: {
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      user_consents: {
        Row: {
          created_at: string
          legal_accepted_at: string
          marketing_opt_in: boolean
          marketing_opt_in_at: string | null
          platform_improvement_opt_in: boolean
          platform_improvement_opt_in_at: string | null
          privacy_version_id: string
          terms_version_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          legal_accepted_at: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          platform_improvement_opt_in?: boolean
          platform_improvement_opt_in_at?: string | null
          privacy_version_id: string
          terms_version_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          legal_accepted_at?: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          platform_improvement_opt_in?: boolean
          platform_improvement_opt_in_at?: string | null
          privacy_version_id?: string
          terms_version_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_privacy_version_id_fkey"
            columns: ["privacy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_consents_terms_version_id_fkey"
            columns: ["terms_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_consents_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_constraints: {
        Row: {
          chat_refinements: Json
          created_at: string
          excluded_areas: Json
          excluded_equipment: Json
          injuries: Json
          preferences: Json
          raw_statements: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_refinements?: Json
          created_at?: string
          excluded_areas?: Json
          excluded_equipment?: Json
          injuries?: Json
          preferences?: Json
          raw_statements?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_refinements?: Json
          created_at?: string
          excluded_areas?: Json
          excluded_equipment?: Json
          injuries?: Json
          preferences?: Json
          raw_statements?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_constraints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_training_profile: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string
          experience_level: string | null
          height_cm: number | null
          physique_phase: string | null
          session_duration_min: number | null
          sex: string | null
          training_focus: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          experience_level?: string | null
          height_cm?: number | null
          physique_phase?: string | null
          session_duration_min?: number | null
          sex?: string | null
          training_focus?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          experience_level?: string | null
          height_cm?: number | null
          physique_phase?: string | null
          session_duration_min?: number | null
          sex?: string | null
          training_focus?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_training_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          textsearchable_index_col: unknown
          timezone: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          textsearchable_index_col?: unknown
          timezone?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          textsearchable_index_col?: unknown
          timezone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          canonical_exercise_id: string
          created_at: string
          id: string
          notes: string | null
          sort_order: number
          source_exercise_id: string | null
          superset_id: number | null
          workout_id: string
        }
        Insert: {
          canonical_exercise_id: string
          created_at?: string
          id?: string
          notes?: string | null
          sort_order: number
          source_exercise_id?: string | null
          superset_id?: number | null
          workout_id: string
        }
        Update: {
          canonical_exercise_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          sort_order?: number
          source_exercise_id?: string | null
          superset_id?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_canonical_exercise_id_fkey"
            columns: ["canonical_exercise_id"]
            isOneToOne: false
            referencedRelation: "canonical_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          custom_metric: number | null
          distance_meters: number | null
          duration_seconds: number | null
          id: string
          rep_range_end: number | null
          rep_range_start: number | null
          reps: number | null
          rpe: number | null
          set_index: number
          set_type: string
          weight_kg: number | null
          workout_exercise_id: string
        }
        Insert: {
          created_at?: string
          custom_metric?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          rep_range_end?: number | null
          rep_range_start?: number | null
          reps?: number | null
          rpe?: number | null
          set_index: number
          set_type: string
          weight_kg?: number | null
          workout_exercise_id: string
        }
        Update: {
          created_at?: string
          custom_metric?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          rep_range_end?: number | null
          rep_range_start?: number | null
          reps?: number | null
          rpe?: number | null
          set_index?: number
          set_type?: string
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string | null
          description: string | null
          ended_at: string
          external_id: string | null
          id: string
          source: Database["public"]["Enums"]["source_type"] | null
          source_updated_at: string | null
          started_at: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ended_at: string
          external_id?: string | null
          id: string
          source?: Database["public"]["Enums"]["source_type"] | null
          source_updated_at?: string | null
          started_at: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ended_at?: string
          external_id?: string | null
          id?: string
          source?: Database["public"]["Enums"]["source_type"] | null
          source_updated_at?: string | null
          started_at?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_raw_statement: {
        Args: { p_statement: string; p_user_id: string }
        Returns: undefined
      }
      delete_secret: { Args: { secret_name: string }; Returns: string }
      get_hevy_key_from_vault: { Args: { p_user_id: string }; Returns: string }
      get_my_feature_limits: {
        Args: never
        Returns: {
          has_active_subscription: boolean
          max_monthly_exports: number
          max_monthly_llm_requests: number
          monthly_exports_used: number
          monthly_llm_requests_used: number
          period_start: string
          remaining_exports: number
          remaining_llm_requests: number
          resets_on: string
          tier: string
          user_id: string
        }[]
      }
      increment_feature_usage: {
        Args: { p_feature: string }
        Returns: undefined
      }
      insert_secret: { Args: { secret: string }; Returns: string }
      read_secret: { Args: { secret_name: string }; Returns: string }
      revise_backed_up_workout: {
        Args: {
          p_description: string
          p_ended_at: string
          p_exercises: Json
          p_sets: Json
          p_source_updated_at: string
          p_started_at: string
          p_title: string
          p_workout_id: string
        }
        Returns: undefined
      }
      search_programs_by_prefix: {
        Args: { prefix: string }
        Returns: {
          created_at: string
          details: string | null
          difficulty: string[] | null
          equipment: string | null
          explore: boolean | null
          id: number
          is_coach: boolean | null
          lock: boolean | null
          program_length: number | null
          programs_textsearchable_index_col: unknown
          prompt: string | null
          saves: number
          specialization: string[] | null
          title: string | null
          user_id: string | null
          workout_duration: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "programs"
          isOneToOne: false
          isSetofReturn: true
        }
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
          textsearchable_index_col: unknown
          timezone: string | null
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      trigger_all_users_hevy_program_sync: { Args: never; Returns: undefined }
    }
    Enums: {
      source_type: "hevy"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      source_type: ["hevy"],
    },
  },
} as const


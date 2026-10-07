export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignment_submissions: {
        Row: {
          assignment_id: string
          body: string
          feedback: string
          file_path: string | null
          graded_at: string | null
          id: string
          score: number | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          body?: string
          feedback?: string
          file_path?: string | null
          graded_at?: string | null
          id?: string
          score?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          body?: string
          feedback?: string
          file_path?: string | null
          graded_at?: string | null
          id?: string
          score?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "course_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          course_id: string
          hours: number
          id: string
          instructor_name: string
          issued_at: string
          quiz_id: string | null
          score: number
          serial: string
          user_id: string
        }
        Insert: {
          course_id: string
          hours?: number
          id?: string
          instructor_name?: string
          issued_at?: string
          quiz_id?: string | null
          score: number
          serial: string
          user_id: string
        }
        Update: {
          course_id?: string
          hours?: number
          id?: string
          instructor_name?: string
          issued_at?: string
          quiz_id?: string | null
          score?: number
          serial?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved: boolean
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved?: boolean
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved?: boolean
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      course_assignments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          instructions: string
          is_required: boolean
          module_id: string | null
          position: number
          resource_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          instructions?: string
          is_required?: boolean
          module_id?: string | null
          position?: number
          resource_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          instructions?: string
          is_required?: boolean
          module_id?: string | null
          position?: number
          resource_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          last_lesson_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_question_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_question_replies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "course_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_question_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_questions: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          is_resolved: boolean
          lesson_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          lesson_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          lesson_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          comment: string
          course_id: string
          created_at: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string
          course_id: string
          created_at?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string
          course_id?: string
          created_at?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string
          duration_minutes: number
          id: string
          instructor_bio: string
          instructor_id: string | null
          instructor_name: string
          instructor_title: string
          level: string
          outcomes: string[]
          require_all_assignments: boolean
          require_all_lessons: boolean
          require_all_quizzes: boolean
          requirements: string[]
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          instructor_bio?: string
          instructor_id?: string | null
          instructor_name?: string
          instructor_title?: string
          level?: string
          outcomes?: string[]
          require_all_assignments?: boolean
          require_all_lessons?: boolean
          require_all_quizzes?: boolean
          requirements?: string[]
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          instructor_bio?: string
          instructor_id?: string | null
          instructor_name?: string
          instructor_title?: string
          level?: string
          outcomes?: string[]
          require_all_assignments?: boolean
          require_all_lessons?: boolean
          require_all_quizzes?: boolean
          requirements?: string[]
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_comments: {
        Row: {
          body: string
          client_token: string | null
          created_at: string
          discussion_id: string
          id: string
          is_removed: boolean
          user_id: string
        }
        Insert: {
          body: string
          client_token?: string | null
          created_at?: string
          discussion_id: string
          id?: string
          is_removed?: boolean
          user_id: string
        }
        Update: {
          body?: string
          client_token?: string | null
          created_at?: string
          discussion_id?: string
          id?: string
          is_removed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_reactions: {
        Row: {
          created_at: string
          discussion_id: string
          reaction: Database["public"]["Enums"]["reaction_kind"]
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          reaction: Database["public"]["Enums"]["reaction_kind"]
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          reaction?: Database["public"]["Enums"]["reaction_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_reactions_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          author_id: string
          body: string
          category: string
          client_token: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["discussion_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category?: string
          client_token?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["discussion_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          client_token?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["discussion_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          id: string
          image_url: string | null
          location: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          timezone: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          timezone?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      lesson_notes: {
        Row: {
          body: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string
          course_id: string
          duration_minutes: number
          id: string
          is_required: boolean
          module_id: string | null
          position: number
          resources: Json
          title: string
          unlock_after_lesson_id: string | null
          video_url: string | null
        }
        Insert: {
          content?: string
          course_id: string
          duration_minutes?: number
          id?: string
          is_required?: boolean
          module_id?: string | null
          position?: number
          resources?: Json
          title: string
          unlock_after_lesson_id?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          duration_minutes?: number
          id?: string
          is_required?: boolean
          module_id?: string | null
          position?: number
          resources?: Json
          title?: string
          unlock_after_lesson_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_unlock_after_lesson_id_fkey"
            columns: ["unlock_after_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          body: string
          category: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          source: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      office_candidates: {
        Row: {
          achievements: string[]
          city: string
          created_at: string
          cv_summary: string
          display_order: number
          education: string[]
          email: string | null
          experience: string[]
          full_name: string
          id: string
          is_visible: boolean
          office_id: string
          phone: string | null
          political_role: string
          portrait_url: string | null
          previous_positions: string[]
          responsibilities: string[]
          summary: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          achievements?: string[]
          city?: string
          created_at?: string
          cv_summary?: string
          display_order?: number
          education?: string[]
          email?: string | null
          experience?: string[]
          full_name: string
          id?: string
          is_visible?: boolean
          office_id: string
          phone?: string | null
          political_role?: string
          portrait_url?: string | null
          previous_positions?: string[]
          responsibilities?: string[]
          summary?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          achievements?: string[]
          city?: string
          created_at?: string
          cv_summary?: string
          display_order?: number
          education?: string[]
          email?: string | null
          experience?: string[]
          full_name?: string
          id?: string
          is_visible?: boolean
          office_id?: string
          phone?: string | null
          political_role?: string
          portrait_url?: string | null
          previous_positions?: string[]
          responsibilities?: string[]
          summary?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_candidates_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      office_officials: {
        Row: {
          created_at: string
          display_order: number
          email: string | null
          full_name: string
          id: string
          is_visible: boolean
          office_id: string
          phone: string | null
          responsibility: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          email?: string | null
          full_name: string
          id?: string
          is_visible?: boolean
          office_id: string
          phone?: string | null
          responsibility: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          email?: string | null
          full_name?: string
          id?: string
          is_visible?: boolean
          office_id?: string
          phone?: string | null
          responsibility?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_officials_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          address: string
          candidate_name: string
          category: string
          city: string
          created_at: string
          created_by: string | null
          description: string
          email: string | null
          governorate: string
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string
          candidate_name?: string
          category?: string
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string
          email?: string | null
          governorate?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string
          candidate_name?: string
          category?: string
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string
          email?: string | null
          governorate?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          position: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          position?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          ends_at: string
          id: string
          question: string
          results_public: boolean
          starts_at: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at: string
          id?: string
          question: string
          results_public?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string
          id?: string
          question?: string
          results_public?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_choices: {
        Row: {
          id: string
          is_correct: boolean
          label: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          label: string
          position?: number
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          label?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string
          id: string
          is_required: boolean
          max_attempts: number | null
          pass_percent: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          id?: string
          is_required?: boolean
          max_attempts?: number | null
          pass_percent?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          is_required?: boolean
          max_attempts?: number | null
          pass_percent?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      transparency_records: {
        Row: {
          category: string
          created_at: string
          document_url: string | null
          id: string
          indicator_label: string | null
          indicator_target: number | null
          indicator_value: number | null
          published_at: string | null
          source: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          created_at?: string
          document_url?: string | null
          id?: string
          indicator_label?: string | null
          indicator_target?: number | null
          indicator_value?: number | null
          published_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          document_url?: string | null
          id?: string
          indicator_label?: string | null
          indicator_target?: number | null
          indicator_value?: number | null
          published_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_super_admin: { Args: never; Returns: boolean }
      can_manage: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      cast_vote: {
        Args: { _option_id: string; _poll_id: string }
        Returns: string
      }
      complete_lesson: { Args: { _lesson_id: string }; Returns: Json }
      course_progress: { Args: { _course_id: string }; Returns: Json }
      discussion_stats: {
        Args: { _discussion_id: string }
        Returns: {
          comments: number
          opposes: number
          supports: number
        }[]
      }
      enroll_course: { Args: { _course_id: string }; Returns: string }
      finalize_course: { Args: { _course_id: string }; Returns: Json }
      get_quiz: { Args: { _quiz_id: string }; Returns: Json }
      grade_assignment: {
        Args: {
          _feedback: string
          _score: number
          _status: string
          _submission_id: string
        }
        Returns: undefined
      }
      grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_course_staff: {
        Args: { _course_id: string; _user_id?: string }
        Returns: boolean
      }
      list_members: {
        Args: never
        Returns: {
          display_name: string
          joined_at: string
          roles: string[]
          user_id: string
        }[]
      }
      poll_results: {
        Args: { _poll_id: string }
        Returns: {
          label: string
          option_id: string
          votes: number
        }[]
      }
      react_to_discussion: {
        Args: {
          _discussion_id: string
          _reaction: Database["public"]["Enums"]["reaction_kind"]
        }
        Returns: undefined
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      set_last_lesson: { Args: { _lesson_id: string }; Returns: undefined }
      submit_quiz: { Args: { _answers: Json; _quiz_id: string }; Returns: Json }
      verify_certificate: { Args: { _serial: string }; Returns: Json }
      write_audit: {
        Args: { _action: string; _entity: string; _entity_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "content_admin"
        | "news_editor"
        | "event_manager"
        | "moderator"
        | "transparency_manager"
        | "academy_manager"
        | "member"
        | "instructor"
      content_status: "draft" | "scheduled" | "published" | "archived"
      discussion_status: "open" | "locked" | "archived"
      event_status: "scheduled" | "cancelled" | "archived"
      reaction_kind: "support" | "oppose"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "content_admin",
        "news_editor",
        "event_manager",
        "moderator",
        "transparency_manager",
        "academy_manager",
        "member",
        "instructor",
      ],
      content_status: ["draft", "scheduled", "published", "archived"],
      discussion_status: ["open", "locked", "archived"],
      event_status: ["scheduled", "cancelled", "archived"],
      reaction_kind: ["support", "oppose"],
    },
  },
} as const

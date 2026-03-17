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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_summaries: {
        Row: {
          case_id: string
          content: Json
          created_at: string | null
          generated_by: string | null
          id: string
          readiness_score: number | null
          summary_type: string
          updated_at: string | null
        }
        Insert: {
          case_id: string
          content?: Json
          created_at?: string | null
          generated_by?: string | null
          id?: string
          readiness_score?: number | null
          summary_type: string
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          content?: Json
          created_at?: string | null
          generated_by?: string | null
          id?: string
          readiness_score?: number | null
          summary_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summaries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summaries_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          case_id: string
          created_at: string | null
          id: string
          notes: string | null
          provider_id: string | null
          scheduled_date: string | null
          specialty: string | null
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          scheduled_date?: string | null
          specialty?: string | null
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          scheduled_date?: string | null
          specialty?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      attorney_applications: {
        Row: {
          bar_number: string | null
          contact_name: string
          created_at: string | null
          email: string
          firm_name: string
          id: string
          notes: string | null
          phone: string
          pi_case_volume_monthly: number | null
          referral_source: string | null
          state: string
          status: string
        }
        Insert: {
          bar_number?: string | null
          contact_name: string
          created_at?: string | null
          email: string
          firm_name: string
          id?: string
          notes?: string | null
          phone: string
          pi_case_volume_monthly?: number | null
          referral_source?: string | null
          state: string
          status?: string
        }
        Update: {
          bar_number?: string | null
          contact_name?: string
          created_at?: string | null
          email?: string
          firm_name?: string
          id?: string
          notes?: string | null
          phone?: string
          pi_case_volume_monthly?: number | null
          referral_source?: string | null
          state?: string
          status?: string
        }
        Relationships: []
      }
      attorney_portal_settings: {
        Row: {
          attorney_id: string
          created_at: string | null
          custom_welcome_message: string | null
          id: string
          show_case_timeline: boolean | null
          show_demand_letters: boolean | null
          show_funding_status: boolean | null
          show_lien_amounts: boolean | null
          show_medical_specials: boolean | null
          show_policy_limits: boolean | null
          show_provider_details: boolean | null
          show_retainer_status: boolean | null
          show_settlement_worksheet: boolean | null
          show_video_messages: boolean | null
          simplified_mode: boolean | null
          update_cadence: string
          updated_at: string | null
        }
        Insert: {
          attorney_id: string
          created_at?: string | null
          custom_welcome_message?: string | null
          id?: string
          show_case_timeline?: boolean | null
          show_demand_letters?: boolean | null
          show_funding_status?: boolean | null
          show_lien_amounts?: boolean | null
          show_medical_specials?: boolean | null
          show_policy_limits?: boolean | null
          show_provider_details?: boolean | null
          show_retainer_status?: boolean | null
          show_settlement_worksheet?: boolean | null
          show_video_messages?: boolean | null
          simplified_mode?: boolean | null
          update_cadence?: string
          updated_at?: string | null
        }
        Update: {
          attorney_id?: string
          created_at?: string | null
          custom_welcome_message?: string | null
          id?: string
          show_case_timeline?: boolean | null
          show_demand_letters?: boolean | null
          show_funding_status?: boolean | null
          show_lien_amounts?: boolean | null
          show_medical_specials?: boolean | null
          show_policy_limits?: boolean | null
          show_provider_details?: boolean | null
          show_retainer_status?: boolean | null
          show_settlement_worksheet?: boolean | null
          show_video_messages?: boolean | null
          simplified_mode?: boolean | null
          update_cadence?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attorney_portal_settings_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: true
            referencedRelation: "attorneys"
            referencedColumns: ["id"]
          },
        ]
      }
      attorneys: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          firm_name: string
          id: string
          phone: string | null
          status: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          firm_name: string
          id?: string
          phone?: string | null
          status?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          firm_name?: string
          id?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      case_sequence: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      case_tasks: {
        Row: {
          assignee_id: string | null
          case_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          sort_order: number | null
          status: string
          title: string
          workplan_template_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          case_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          sort_order?: number | null
          status?: string
          title: string
          workplan_template_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          case_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          sort_order?: number | null
          status?: string
          title?: string
          workplan_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_tasks_workplan_template_id_fkey"
            columns: ["workplan_template_id"]
            isOneToOne: false
            referencedRelation: "workplan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      case_timelines: {
        Row: {
          auto_generated: boolean | null
          case_id: string
          created_at: string | null
          event_date: string
          event_detail: string | null
          event_title: string
          event_type: string
          id: string
          visible_to: string[]
        }
        Insert: {
          auto_generated?: boolean | null
          case_id: string
          created_at?: string | null
          event_date: string
          event_detail?: string | null
          event_title: string
          event_type: string
          id?: string
          visible_to?: string[]
        }
        Update: {
          auto_generated?: boolean | null
          case_id?: string
          created_at?: string | null
          event_date?: string
          event_detail?: string | null
          event_title?: string
          event_type?: string
          id?: string
          visible_to?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "case_timelines_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_timelines_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      case_updates: {
        Row: {
          author_id: string | null
          case_id: string
          created_at: string | null
          id: string
          message: string
        }
        Insert: {
          author_id?: string | null
          case_id: string
          created_at?: string | null
          id?: string
          message: string
        }
        Update: {
          author_id?: string | null
          case_id?: string
          created_at?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_updates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_updates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          accident_date: string | null
          accident_state: string | null
          attorney_id: string | null
          case_number: string
          created_at: string | null
          flag: string | null
          id: string
          lien_amount: number
          notes: string | null
          opened_date: string
          patient_email: string | null
          patient_name: string
          patient_phone: string | null
          provider_id: string | null
          settlement_estimate: number | null
          settlement_final: number | null
          sol_date: string | null
          sol_period_days: number
          specialty: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accident_date?: string | null
          accident_state?: string | null
          attorney_id?: string | null
          case_number?: string
          created_at?: string | null
          flag?: string | null
          id?: string
          lien_amount?: number
          notes?: string | null
          opened_date?: string
          patient_email?: string | null
          patient_name: string
          patient_phone?: string | null
          provider_id?: string | null
          settlement_estimate?: number | null
          settlement_final?: number | null
          sol_date?: string | null
          sol_period_days?: number
          specialty?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accident_date?: string | null
          accident_state?: string | null
          attorney_id?: string | null
          case_number?: string
          created_at?: string | null
          flag?: string | null
          id?: string
          lien_amount?: number
          notes?: string | null
          opened_date?: string
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string | null
          provider_id?: string | null
          settlement_estimate?: number | null
          settlement_final?: number | null
          sol_date?: string | null
          sol_period_days?: number
          specialty?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: false
            referencedRelation: "attorneys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          allowed_amount: number | null
          billing_path: string | null
          case_id: string
          charge_amount: number
          cpt_code: string
          cpt_description: string | null
          created_at: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          provider_id: string | null
          service_date: string
          status: string
          units: number | null
        }
        Insert: {
          allowed_amount?: number | null
          billing_path?: string | null
          case_id: string
          charge_amount?: number
          cpt_code: string
          cpt_description?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          provider_id?: string | null
          service_date: string
          status?: string
          units?: number | null
        }
        Update: {
          allowed_amount?: number | null
          billing_path?: string | null
          case_id?: string
          charge_amount?: number
          cpt_code?: string
          cpt_description?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          provider_id?: string | null
          service_date?: string
          status?: string
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_letters: {
        Row: {
          case_id: string
          colossus_factors: Json | null
          colossus_score: number | null
          content: string
          created_at: string | null
          finalized_at: string | null
          generated_by: string | null
          id: string
          medical_specials: number | null
          model_used: string | null
          pain_suffering_demand: number | null
          reviewed_by: string | null
          sent_at: string | null
          sent_to: string | null
          status: string
          total_demand: number | null
          version: number
        }
        Insert: {
          case_id: string
          colossus_factors?: Json | null
          colossus_score?: number | null
          content: string
          created_at?: string | null
          finalized_at?: string | null
          generated_by?: string | null
          id?: string
          medical_specials?: number | null
          model_used?: string | null
          pain_suffering_demand?: number | null
          reviewed_by?: string | null
          sent_at?: string | null
          sent_to?: string | null
          status?: string
          total_demand?: number | null
          version?: number
        }
        Update: {
          case_id?: string
          colossus_factors?: Json | null
          colossus_score?: number | null
          content?: string
          created_at?: string | null
          finalized_at?: string | null
          generated_by?: string | null
          id?: string
          medical_specials?: number | null
          model_used?: string | null
          pain_suffering_demand?: number | null
          reviewed_by?: string | null
          sent_at?: string | null
          sent_to?: string | null
          status?: string
          total_demand?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "demand_letters_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_letters_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_letters_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_letters_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string | null
          created_at: string | null
          document_type: string
          file_name: string
          id: string
          signed: boolean | null
          signed_at: string | null
          storage_path: string
          uploader_id: string | null
          visible_to: string[]
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          document_type: string
          file_name: string
          id?: string
          signed?: boolean | null
          signed_at?: string | null
          storage_path: string
          uploader_id?: string | null
          visible_to?: string[]
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          document_type?: string
          file_name?: string
          id?: string
          signed?: boolean | null
          signed_at?: string | null
          storage_path?: string
          uploader_id?: string | null
          visible_to?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funder_profiles: {
        Row: {
          accredited_investor: boolean | null
          company_name: string
          contact_name: string
          created_at: string | null
          email: string
          funding_capacity_max: number | null
          funding_capacity_min: number | null
          id: string
          phone: string | null
          preferred_specialties: string[] | null
          preferred_states: string[] | null
          profile_id: string | null
        }
        Insert: {
          accredited_investor?: boolean | null
          company_name: string
          contact_name: string
          created_at?: string | null
          email: string
          funding_capacity_max?: number | null
          funding_capacity_min?: number | null
          id?: string
          phone?: string | null
          preferred_specialties?: string[] | null
          preferred_states?: string[] | null
          profile_id?: string | null
        }
        Update: {
          accredited_investor?: boolean | null
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          funding_capacity_max?: number | null
          funding_capacity_min?: number | null
          id?: string
          phone?: string | null
          preferred_specialties?: string[] | null
          preferred_states?: string[] | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funder_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_requests: {
        Row: {
          advance_date: string | null
          approved_amount: number | null
          case_id: string
          created_at: string | null
          funder_id: string | null
          funding_agreement_date: string | null
          funding_agreement_signed: boolean | null
          funding_company: string | null
          funding_type: string | null
          id: string
          interest_rate: number | null
          notes: string | null
          payoff_amount: number | null
          plaintiff_name: string | null
          repayment_amount: number | null
          repayment_date: string | null
          requested_amount: number
          status: string
        }
        Insert: {
          advance_date?: string | null
          approved_amount?: number | null
          case_id: string
          created_at?: string | null
          funder_id?: string | null
          funding_agreement_date?: string | null
          funding_agreement_signed?: boolean | null
          funding_company?: string | null
          funding_type?: string | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          payoff_amount?: number | null
          plaintiff_name?: string | null
          repayment_amount?: number | null
          repayment_date?: string | null
          requested_amount: number
          status?: string
        }
        Update: {
          advance_date?: string | null
          approved_amount?: number | null
          case_id?: string
          created_at?: string | null
          funder_id?: string | null
          funding_agreement_date?: string | null
          funding_agreement_signed?: boolean | null
          funding_company?: string | null
          funding_type?: string | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          payoff_amount?: number | null
          plaintiff_name?: string | null
          repayment_amount?: number | null
          repayment_date?: string | null
          requested_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_requests_funder_id_fkey"
            columns: ["funder_id"]
            isOneToOne: false
            referencedRelation: "funder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_colossus_data: {
        Row: {
          case_id: string
          created_at: string | null
          estimated_colossus_range_high: number | null
          estimated_colossus_range_low: number | null
          id: string
          imaging_performed: boolean | null
          impairment_rating_percent: number | null
          injury_severity: string | null
          insurance_carrier: string | null
          liability_strength: string | null
          lost_wages_amount: number | null
          lost_wages_claimed: boolean | null
          notes: string | null
          pain_duration_description: string | null
          permanent_impairment: boolean | null
          policy_limit: number | null
          pre_existing_conditions: boolean | null
          specialty_count: number | null
          surgery_performed: boolean | null
          total_medical_specials: number | null
          treatment_duration_days: number | null
          updated_at: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          estimated_colossus_range_high?: number | null
          estimated_colossus_range_low?: number | null
          id?: string
          imaging_performed?: boolean | null
          impairment_rating_percent?: number | null
          injury_severity?: string | null
          insurance_carrier?: string | null
          liability_strength?: string | null
          lost_wages_amount?: number | null
          lost_wages_claimed?: boolean | null
          notes?: string | null
          pain_duration_description?: string | null
          permanent_impairment?: boolean | null
          policy_limit?: number | null
          pre_existing_conditions?: boolean | null
          specialty_count?: number | null
          surgery_performed?: boolean | null
          total_medical_specials?: number | null
          treatment_duration_days?: number | null
          updated_at?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          estimated_colossus_range_high?: number | null
          estimated_colossus_range_low?: number | null
          id?: string
          imaging_performed?: boolean | null
          impairment_rating_percent?: number | null
          injury_severity?: string | null
          insurance_carrier?: string | null
          liability_strength?: string | null
          lost_wages_amount?: number | null
          lost_wages_claimed?: boolean | null
          notes?: string | null
          pain_duration_description?: string | null
          permanent_impairment?: boolean | null
          policy_limit?: number | null
          pre_existing_conditions?: boolean | null
          specialty_count?: number | null
          surgery_performed?: boolean | null
          total_medical_specials?: number | null
          treatment_duration_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_colossus_data_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_colossus_data_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_eligibility: {
        Row: {
          amount_used: number | null
          billing_path: string
          carrier_name: string | null
          case_id: string
          coverage_limit: number | null
          created_at: string | null
          id: string
          insurance_type: string
          notes: string | null
          policy_number: string | null
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_used?: number | null
          billing_path?: string
          carrier_name?: string | null
          case_id: string
          coverage_limit?: number | null
          created_at?: string | null
          id?: string
          insurance_type?: string
          notes?: string | null
          policy_number?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_used?: number | null
          billing_path?: string
          carrier_name?: string | null
          case_id?: string
          coverage_limit?: number | null
          created_at?: string | null
          id?: string
          insurance_type?: string
          notes?: string | null
          policy_number?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_eligibility_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_eligibility_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_eligibility_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      liens: {
        Row: {
          amount: number
          case_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          provider_id: string | null
          reduction_amount: number
          status: string
        }
        Insert: {
          amount?: number
          case_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          provider_id?: string | null
          reduction_amount?: number
          status?: string
        }
        Update: {
          amount?: number
          case_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          provider_id?: string | null
          reduction_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "liens_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liens_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liens_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          recipient_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          recipient_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          recipient_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_checkins: {
        Row: {
          case_id: string
          created_at: string | null
          id: string
          logged_by: string | null
          mood: string | null
          notes: string | null
          pain_level: number | null
          patient_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          id?: string
          logged_by?: string | null
          mood?: string | null
          notes?: string | null
          pain_level?: number | null
          patient_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          id?: string
          logged_by?: string | null
          mood?: string | null
          notes?: string | null
          pain_level?: number | null
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_checkins_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_checkins_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          accident_description: string | null
          address: string | null
          aob_date: string | null
          assignment_of_benefits_signed: boolean | null
          case_id: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          hipaa_auth_date: string | null
          hipaa_auth_signed: boolean | null
          id: string
          insurance_status: string | null
          preferred_language: string | null
          profile_id: string | null
          state: string | null
          zip: string | null
        }
        Insert: {
          accident_description?: string | null
          address?: string | null
          aob_date?: string | null
          assignment_of_benefits_signed?: boolean | null
          case_id?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          hipaa_auth_date?: string | null
          hipaa_auth_signed?: boolean | null
          id?: string
          insurance_status?: string | null
          preferred_language?: string | null
          profile_id?: string | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          accident_description?: string | null
          address?: string | null
          aob_date?: string | null
          assignment_of_benefits_signed?: boolean | null
          case_id?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          hipaa_auth_date?: string | null
          hipaa_auth_signed?: boolean | null
          id?: string
          insurance_status?: string | null
          preferred_language?: string | null
          profile_id?: string | null
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_details: {
        Row: {
          adjuster_email: string | null
          adjuster_name: string | null
          adjuster_phone: string | null
          case_id: string
          claim_number: string | null
          coverage_dispute_notes: string | null
          coverage_disputed: boolean | null
          created_at: string | null
          id: string
          insurance_carrier: string | null
          medpay_limit: number | null
          pip_exhausted: boolean | null
          pip_limit: number | null
          policy_limit_bodily_injury: number | null
          policy_limit_per_accident: number | null
          retainer_date: string | null
          retainer_fee_percent: number | null
          retainer_signed: boolean | null
          um_uim_limit: number | null
          updated_at: string | null
        }
        Insert: {
          adjuster_email?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          case_id: string
          claim_number?: string | null
          coverage_dispute_notes?: string | null
          coverage_disputed?: boolean | null
          created_at?: string | null
          id?: string
          insurance_carrier?: string | null
          medpay_limit?: number | null
          pip_exhausted?: boolean | null
          pip_limit?: number | null
          policy_limit_bodily_injury?: number | null
          policy_limit_per_accident?: number | null
          retainer_date?: string | null
          retainer_fee_percent?: number | null
          retainer_signed?: boolean | null
          um_uim_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          adjuster_email?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          case_id?: string
          claim_number?: string | null
          coverage_dispute_notes?: string | null
          coverage_disputed?: boolean | null
          created_at?: string | null
          id?: string
          insurance_carrier?: string | null
          medpay_limit?: number | null
          pip_exhausted?: boolean | null
          pip_limit?: number | null
          policy_limit_bodily_injury?: number | null
          policy_limit_per_accident?: number | null
          retainer_date?: string | null
          retainer_fee_percent?: number | null
          retainer_signed?: boolean | null
          um_uim_limit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_details_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_details_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          firm_id: string | null
          full_name: string | null
          id: string
          provider_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          firm_id?: string | null
          full_name?: string | null
          id: string
          provider_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          firm_id?: string | null
          full_name?: string | null
          id?: string
          provider_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "attorneys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_applications: {
        Row: {
          contact_name: string
          created_at: string | null
          email: string
          hipaa_baa_agreed: boolean | null
          id: string
          license_number: string | null
          lien_experience: boolean | null
          locations: number | null
          notes: string | null
          phone: string
          practice_name: string
          specialty: string
          state: string
          status: string
        }
        Insert: {
          contact_name: string
          created_at?: string | null
          email: string
          hipaa_baa_agreed?: boolean | null
          id?: string
          license_number?: string | null
          lien_experience?: boolean | null
          locations?: number | null
          notes?: string | null
          phone: string
          practice_name: string
          specialty: string
          state: string
          status?: string
        }
        Update: {
          contact_name?: string
          created_at?: string | null
          email?: string
          hipaa_baa_agreed?: boolean | null
          id?: string
          license_number?: string | null
          lien_experience?: boolean | null
          locations?: number | null
          notes?: string | null
          phone?: string
          practice_name?: string
          specialty?: string
          state?: string
          status?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          created_at: string | null
          credentialing_expiry: string | null
          hipaa_baa_on_file: boolean | null
          id: string
          locations: number | null
          name: string
          notes: string | null
          rating: number | null
          specialty: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          credentialing_expiry?: string | null
          hipaa_baa_on_file?: boolean | null
          id?: string
          locations?: number | null
          name: string
          notes?: string | null
          rating?: number | null
          specialty?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          credentialing_expiry?: string | null
          hipaa_baa_on_file?: boolean | null
          id?: string
          locations?: number | null
          name?: string
          notes?: string | null
          rating?: number | null
          specialty?: string | null
          status?: string
        }
        Relationships: []
      }
      rcm_cases: {
        Row: {
          appeal_date: string | null
          appeal_submitted: boolean | null
          billed_amount: number
          case_id: string | null
          claim_number: string | null
          cpt_codes: string[]
          created_at: string | null
          date_of_service: string
          denial_code: string | null
          denial_reason: string | null
          icd_codes: string[]
          id: string
          insurance_carrier: string | null
          notes: string | null
          paid_amount: number | null
          patient_name: string
          payment_date: string | null
          provider_id: string
          submission_date: string | null
          submission_status: string
        }
        Insert: {
          appeal_date?: string | null
          appeal_submitted?: boolean | null
          billed_amount: number
          case_id?: string | null
          claim_number?: string | null
          cpt_codes?: string[]
          created_at?: string | null
          date_of_service: string
          denial_code?: string | null
          denial_reason?: string | null
          icd_codes?: string[]
          id?: string
          insurance_carrier?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_name: string
          payment_date?: string | null
          provider_id: string
          submission_date?: string | null
          submission_status?: string
        }
        Update: {
          appeal_date?: string | null
          appeal_submitted?: boolean | null
          billed_amount?: number
          case_id?: string | null
          claim_number?: string | null
          cpt_codes?: string[]
          created_at?: string | null
          date_of_service?: string
          denial_code?: string | null
          denial_reason?: string | null
          icd_codes?: string[]
          id?: string
          insurance_carrier?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_name?: string
          payment_date?: string | null
          provider_id?: string
          submission_date?: string | null
          submission_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_cases_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      records: {
        Row: {
          case_id: string
          created_at: string | null
          delivered_to_attorney_date: string | null
          hipaa_auth_on_file: boolean | null
          id: string
          notes: string | null
          provider_id: string | null
          received_date: string | null
          record_type: string | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          delivered_to_attorney_date?: string | null
          hipaa_auth_on_file?: boolean | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          received_date?: string | null
          record_type?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          delivered_to_attorney_date?: string | null
          hipaa_auth_on_file?: boolean | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          received_date?: string | null
          record_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "records_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_sources: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          referring_attorney_id: string | null
          source_detail: string | null
          source_type: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          referring_attorney_id?: string | null
          source_detail?: string | null
          source_type: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          referring_attorney_id?: string | null
          source_detail?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_sources_referring_attorney_id_fkey"
            columns: ["referring_attorney_id"]
            isOneToOne: false
            referencedRelation: "attorneys"
            referencedColumns: ["id"]
          },
        ]
      }
      sol_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_tier: number
          case_id: string
          id: string
          recipient_email: string | null
          sent_at: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_tier: number
          case_id: string
          id?: string
          recipient_email?: string | null
          sent_at?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_tier?: number
          case_id?: string
          id?: string
          recipient_email?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sol_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sol_alerts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sol_alerts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      video_messages: {
        Row: {
          ai_generated_script: boolean | null
          case_id: string | null
          created_at: string | null
          created_by: string | null
          duration_seconds: number | null
          id: string
          message_type: string
          recipient_id: string | null
          recipient_role: string
          script: string
          sent_at: string | null
          storage_path: string | null
          thumbnail_path: string | null
          viewed: boolean | null
          viewed_at: string | null
        }
        Insert: {
          ai_generated_script?: boolean | null
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          message_type: string
          recipient_id?: string | null
          recipient_role: string
          script: string
          sent_at?: string | null
          storage_path?: string | null
          thumbnail_path?: string | null
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Update: {
          ai_generated_script?: boolean | null
          case_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          message_type?: string
          recipient_id?: string | null
          recipient_role?: string
          script?: string
          sent_at?: string | null
          storage_path?: string | null
          thumbnail_path?: string | null
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workplan_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          tasks: Json
          trigger_status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tasks?: Json
          trigger_status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tasks?: Json
          trigger_status?: string
        }
        Relationships: []
      }
    }
    Views: {
      cases_with_counts: {
        Row: {
          accident_date: string | null
          accident_state: string | null
          appointments_completed: number | null
          appointments_total: number | null
          attorney_id: string | null
          case_number: string | null
          created_at: string | null
          flag: string | null
          id: string | null
          lien_amount: number | null
          notes: string | null
          opened_date: string | null
          patient_email: string | null
          patient_name: string | null
          patient_phone: string | null
          provider_id: string | null
          settlement_estimate: number | null
          settlement_final: number | null
          sol_date: string | null
          sol_period_days: number | null
          specialty: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accident_date?: string | null
          accident_state?: string | null
          appointments_completed?: never
          appointments_total?: never
          attorney_id?: string | null
          case_number?: string | null
          created_at?: string | null
          flag?: string | null
          id?: string | null
          lien_amount?: number | null
          notes?: string | null
          opened_date?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          provider_id?: string | null
          settlement_estimate?: number | null
          settlement_final?: number | null
          sol_date?: string | null
          sol_period_days?: number | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accident_date?: string | null
          accident_state?: string | null
          appointments_completed?: never
          appointments_total?: never
          attorney_id?: string | null
          case_number?: string | null
          created_at?: string | null
          flag?: string | null
          id?: string | null
          lien_amount?: number | null
          notes?: string | null
          opened_date?: string | null
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          provider_id?: string | null
          settlement_estimate?: number | null
          settlement_final?: number | null
          sol_date?: string | null
          sol_period_days?: number | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: false
            referencedRelation: "attorneys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_firm_id: { Args: { _user_id: string }; Returns: string }
      get_user_provider_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      next_case_number: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  clinical: {
    Tables: {
      bone_marrow: {
        Row: {
          bone_marrow_results_by_component: string | null
          component_id: string | null
          created_at: string | null
          hsp_account_id: string
          id: number
          lab_code: string | null
          lab_component_description: string | null
          lab_name: string | null
          order_id: string | null
          patient_mrn: string
          result_time: string
          updated_at: string | null
        }
        Insert: {
          bone_marrow_results_by_component?: string | null
          component_id?: string | null
          created_at?: string | null
          hsp_account_id: string
          id?: number
          lab_code?: string | null
          lab_component_description?: string | null
          lab_name?: string | null
          order_id?: string | null
          patient_mrn: string
          result_time: string
          updated_at?: string | null
        }
        Update: {
          bone_marrow_results_by_component?: string | null
          component_id?: string | null
          created_at?: string | null
          hsp_account_id?: string
          id?: number
          lab_code?: string | null
          lab_component_description?: string | null
          lab_name?: string | null
          order_id?: string | null
          patient_mrn?: string
          result_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      demographics: {
        Row: {
          age: number | null
          alcohol_user_yn: string | null
          birth_date: string | null
          created_at: string | null
          ethnicity: string | null
          gender: string | null
          id: number
          ill_drug_user_yn: string | null
          is_tobacco_user_yn: string | null
          patient_mrn: string | null
          race: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          alcohol_user_yn?: string | null
          birth_date?: string | null
          created_at?: string | null
          ethnicity?: string | null
          gender?: string | null
          id?: number
          ill_drug_user_yn?: string | null
          is_tobacco_user_yn?: string | null
          patient_mrn?: string | null
          race?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          alcohol_user_yn?: string | null
          birth_date?: string | null
          created_at?: string | null
          ethnicity?: string | null
          gender?: string | null
          id?: number
          ill_drug_user_yn?: string | null
          is_tobacco_user_yn?: string | null
          patient_mrn?: string | null
          race?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ip_admissions: {
        Row: {
          adm_date_time: string
          admit_dx_cd_1: string | null
          admit_dx_cd_2: string | null
          admit_dx_description_1: string | null
          admit_dx_description_2: string | null
          created_at: string | null
          date_issue_notes: string | null
          disch_date_time: string | null
          discharge_department: string | null
          discharge_disposition: string | null
          final_dx_cd_1: string | null
          final_dx_cd_2: string | null
          final_dx_cd_3: string | null
          final_dx_cd_4: string | null
          final_dx_cd_5: string | null
          final_dx_description_1: string | null
          final_dx_description_2: string | null
          final_dx_description_3: string | null
          final_dx_description_4: string | null
          final_dx_description_5: string | null
          has_date_issues: boolean | null
          hsp_account_id: string
          icu_admission_yn: string | null
          id: number
          patient_mrn: string
          updated_at: string | null
        }
        Insert: {
          adm_date_time: string
          admit_dx_cd_1?: string | null
          admit_dx_cd_2?: string | null
          admit_dx_description_1?: string | null
          admit_dx_description_2?: string | null
          created_at?: string | null
          date_issue_notes?: string | null
          disch_date_time?: string | null
          discharge_department?: string | null
          discharge_disposition?: string | null
          final_dx_cd_1?: string | null
          final_dx_cd_2?: string | null
          final_dx_cd_3?: string | null
          final_dx_cd_4?: string | null
          final_dx_cd_5?: string | null
          final_dx_description_1?: string | null
          final_dx_description_2?: string | null
          final_dx_description_3?: string | null
          final_dx_description_4?: string | null
          final_dx_description_5?: string | null
          has_date_issues?: boolean | null
          hsp_account_id: string
          icu_admission_yn?: string | null
          id?: number
          patient_mrn: string
          updated_at?: string | null
        }
        Update: {
          adm_date_time?: string
          admit_dx_cd_1?: string | null
          admit_dx_cd_2?: string | null
          admit_dx_description_1?: string | null
          admit_dx_description_2?: string | null
          created_at?: string | null
          date_issue_notes?: string | null
          disch_date_time?: string | null
          discharge_department?: string | null
          discharge_disposition?: string | null
          final_dx_cd_1?: string | null
          final_dx_cd_2?: string | null
          final_dx_cd_3?: string | null
          final_dx_cd_4?: string | null
          final_dx_cd_5?: string | null
          final_dx_description_1?: string | null
          final_dx_description_2?: string | null
          final_dx_description_3?: string | null
          final_dx_description_4?: string | null
          final_dx_description_5?: string | null
          has_date_issues?: boolean | null
          hsp_account_id?: string
          icu_admission_yn?: string | null
          id?: number
          patient_mrn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ip_medications: {
        Row: {
          adm_date_time: string
          created_at: string | null
          date_issue_notes: string | null
          disch_date_time: string | null
          dosage: string | null
          frequency: string | null
          has_date_issues: boolean | null
          hsp_account_id: string
          id: number
          medication: string
          patient_mrn: string
          rx_class_name: string | null
          taken_time: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          adm_date_time: string
          created_at?: string | null
          date_issue_notes?: string | null
          disch_date_time?: string | null
          dosage?: string | null
          frequency?: string | null
          has_date_issues?: boolean | null
          hsp_account_id: string
          id?: number
          medication: string
          patient_mrn: string
          rx_class_name?: string | null
          taken_time?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          adm_date_time?: string
          created_at?: string | null
          date_issue_notes?: string | null
          disch_date_time?: string | null
          dosage?: string | null
          frequency?: string | null
          has_date_issues?: boolean | null
          hsp_account_id?: string
          id?: number
          medication?: string
          patient_mrn?: string
          rx_class_name?: string | null
          taken_time?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      Labs: {
        Row: {
          component_id: string | null
          created_at: string
          id: number
          lab_component_description: string | null
          lab_result_value: string | null
          order_time: string | null
          pat_enc_csn_id: string | null
          patient_mrn: string
          proc_code: string | null
          proc_name: string | null
          result_time: string | null
          updated_at: string
        }
        Insert: {
          component_id?: string | null
          created_at?: string
          id?: number
          lab_component_description?: string | null
          lab_result_value?: string | null
          order_time?: string | null
          pat_enc_csn_id?: string | null
          patient_mrn: string
          proc_code?: string | null
          proc_name?: string | null
          result_time?: string | null
          updated_at?: string
        }
        Update: {
          component_id?: string | null
          created_at?: string
          id?: number
          lab_component_description?: string | null
          lab_result_value?: string | null
          order_time?: string | null
          pat_enc_csn_id?: string | null
          patient_mrn?: string
          proc_code?: string | null
          proc_name?: string | null
          result_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      op_medications: {
        Row: {
          created_at: string | null
          generic_description: string | null
          hsp_account_id: string
          id: number
          order_dttm: string | null
          order_med_id: string | null
          patient_mrn: string
          rx_status: string | null
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          created_at?: string | null
          generic_description?: string | null
          hsp_account_id: string
          id?: number
          order_dttm?: string | null
          order_med_id?: string | null
          patient_mrn: string
          rx_status?: string | null
          updated_at?: string | null
          visit_date: string
        }
        Update: {
          created_at?: string | null
          generic_description?: string | null
          hsp_account_id?: string
          id?: number
          order_dttm?: string | null
          order_med_id?: string | null
          patient_mrn?: string
          rx_status?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: []
      }
      op_visits: {
        Row: {
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string | null
          current_icd10_list: string | null
          department_id: string | null
          department_name: string | null
          dx_name: string | null
          hsp_account_id: string
          id: number
          pat_id: string | null
          patient_mrn: string
          updated_at: string | null
          visit_date: string
          visit_type: string | null
          weight_kg: number | null
          weight_lbs: number | null
        }
        Insert: {
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string | null
          current_icd10_list?: string | null
          department_id?: string | null
          department_name?: string | null
          dx_name?: string | null
          hsp_account_id: string
          id?: number
          pat_id?: string | null
          patient_mrn: string
          updated_at?: string | null
          visit_date: string
          visit_type?: string | null
          weight_kg?: number | null
          weight_lbs?: number | null
        }
        Update: {
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string | null
          current_icd10_list?: string | null
          department_id?: string | null
          department_name?: string | null
          dx_name?: string | null
          hsp_account_id?: string
          id?: number
          pat_id?: string | null
          patient_mrn?: string
          updated_at?: string | null
          visit_date?: string
          visit_type?: string | null
          weight_kg?: number | null
          weight_lbs?: number | null
        }
        Relationships: []
      }
      unified_visits: {
        Row: {
          admit_dx_cd: string | null
          admit_dx_description: string | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          department: string | null
          discharge_disposition: string | null
          dx_codes: string | null
          dx_names: string | null
          end_date: string | null
          final_dx_cd: string | null
          final_dx_description: string | null
          heart_rate: number | null
          icu_admission_yn: string | null
          id: string
          patient_mrn: string
          respiratory_rate: number | null
          source_id: string
          specific_visit_type: string | null
          spo2: number | null
          start_date: string
          temperature_f: number | null
          updated_at: string
          visit_id: string
          visit_type: string
          weight_kg: number | null
        }
        Insert: {
          admit_dx_cd?: string | null
          admit_dx_description?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          department?: string | null
          discharge_disposition?: string | null
          dx_codes?: string | null
          dx_names?: string | null
          end_date?: string | null
          final_dx_cd?: string | null
          final_dx_description?: string | null
          heart_rate?: number | null
          icu_admission_yn?: string | null
          id: string
          patient_mrn: string
          respiratory_rate?: number | null
          source_id: string
          specific_visit_type?: string | null
          spo2?: number | null
          start_date: string
          temperature_f?: number | null
          updated_at?: string
          visit_id: string
          visit_type: string
          weight_kg?: number | null
        }
        Update: {
          admit_dx_cd?: string | null
          admit_dx_description?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          department?: string | null
          discharge_disposition?: string | null
          dx_codes?: string | null
          dx_names?: string | null
          end_date?: string | null
          final_dx_cd?: string | null
          final_dx_description?: string | null
          heart_rate?: number | null
          icu_admission_yn?: string | null
          id?: string
          patient_mrn?: string
          respiratory_rate?: number | null
          source_id?: string
          specific_visit_type?: string | null
          spo2?: number | null
          start_date?: string
          temperature_f?: number | null
          updated_at?: string
          visit_id?: string
          visit_type?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      visit_associated_labs: {
        Row: {
          component_id: string | null
          created_at: string | null
          id: number | null
          lab_component_description: string | null
          lab_result_value: string | null
          order_time: string | null
          pat_enc_csn_id: string | null
          patient_mrn: string | null
          proc_code: string | null
          proc_name: string | null
          result_time: string | null
          updated_at: string | null
          visit_id: string | null
          visit_type: string | null
        }
        Relationships: []
      }
      visit_associated_medications: {
        Row: {
          medication_data: Json | null
          visit_id: string | null
          visit_type: string | null
        }
        Relationships: []
      }
      visit_diagnoses_view: {
        Row: {
          diagnoses: Json | null
          start_date: string | null
          visit_id: string | null
          visit_type: string | null
        }
        Insert: {
          diagnoses?: never
          start_date?: string | null
          visit_id?: string | null
          visit_type?: string | null
        }
        Update: {
          diagnoses?: never
          start_date?: string | null
          visit_id?: string | null
          visit_type?: string | null
        }
        Relationships: []
      }
      visit_timeline_view: {
        Row: {
          end_date: string | null
          event_data: Json | null
          event_time: string | null
          event_timing: string | null
          event_type: string | null
          hours_from_visit: number | null
          start_date: string | null
          visit_id: string | null
          visit_type: string | null
        }
        Relationships: []
      }
      visit_vitals_view: {
        Row: {
          blood_pressure: Json | null
          bp_diastolic: number | null
          bp_systolic: number | null
          heart_rate: number | null
          respiratory_rate: number | null
          specific_visit_type: string | null
          spo2: number | null
          start_date: string | null
          temperature_f: number | null
          visit_id: string | null
          visit_type: string | null
          weight_kg: number | null
        }
        Insert: {
          blood_pressure?: never
          bp_diastolic?: number | null
          bp_systolic?: number | null
          heart_rate?: number | null
          respiratory_rate?: number | null
          specific_visit_type?: string | null
          spo2?: number | null
          start_date?: string | null
          temperature_f?: number | null
          visit_id?: string | null
          visit_type?: string | null
          weight_kg?: number | null
        }
        Update: {
          blood_pressure?: never
          bp_diastolic?: number | null
          bp_systolic?: number | null
          heart_rate?: number | null
          respiratory_rate?: number | null
          specific_visit_type?: string | null
          spo2?: number | null
          start_date?: string | null
          temperature_f?: number | null
          visit_id?: string | null
          visit_type?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

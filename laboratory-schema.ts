export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  laboratory: {
    Tables: {
      omics_results: {
        Row: {
          age_at_collection: number | null
          cell_number_1_pbmc: number | null
          cell_number_2_pbmc: number | null
          cells_adhered_adhesion: number | null
          chr_advia: number | null
          concentration_1_dna: number | null
          concentration_2_dna: number | null
          created_at: string | null
          cytometer_f_cells: string | null
          date_adhesion: string | null
          date_advia: string | null
          date_dna: string | null
          date_f_cells: string | null
          date_hplc: string | null
          date_hvr: string | null
          date_lorrca: string | null
          date_of_collection: string | null
          date_plasma: string | null
          date_pmbc: string | null
          date_visc: string | null
          days_to_processing: number | null
          drbc_advia: number | null
          ei_delta_lorrca: number | null
          ei_max_lorrca: number | null
          ei_min_lorrca: number | null
          genotype: string | null
          hb_advia: number | null
          hba_percent_d10_hplc: number | null
          hba_percent_grady_hplc: number | null
          hba2_percent_d10_hplc: number | null
          hba2_percent_grady_hplc: number | null
          hbc_percent_d10_hplc: number | null
          hbc_percent_grady_hplc: number | null
          hbf_percent_d10_fcell_ratio: number | null
          hbf_percent_d10_hplc: number | null
          hbf_percent_grady_fcell_ratio: number | null
          hbf_percent_grady_hplc: number | null
          hbs_percent_d10_hplc: number | null
          hbs_percent_grady_hplc: number | null
          hc41_v120_advia: number | null
          hc41_v60_120_advia: number | null
          hc41_v60_advia: number | null
          hct_advia: number | null
          hdw_advia: number | null
          hvr_225: number | null
          hvr_45: number | null
          hyper_advia: number | null
          id: string
          instrument_lorrca: string | null
          mch_advia: number | null
          mchc_advia: number | null
          mcv_advia: number | null
          mpv_advia: number | null
          neut_advia: number | null
          nrbc_advia: number | null
          percent_f_cells: number | null
          plt_advia: number | null
          pos_lorrca: number | null
          project: string | null
          purity_1_dna: number | null
          purity_2_dna: number | null
          qc_notes_adhesion: string | null
          qc_notes_advia: string | null
          qc_notes_dna: string | null
          qc_notes_f_cells: string | null
          qc_notes_hvr: string | null
          qc_notes_lorrca: string | null
          qc_notes_pbmc: string | null
          qc_notes_plasma: string | null
          qc_notes_viscosity: string | null
          qc_pass_adhesion: string | null
          qc_pass_advia: string | null
          qc_pass_dna: string | null
          qc_pass_f_cells: string | null
          qc_pass_hvr: string | null
          qc_pass_lorrca: string | null
          qc_pass_viscosity: string | null
          rbc_advia: number | null
          rdw_advia: number | null
          retic_advia: number | null
          sample_id: string
          sample_number: number
          sent_to_gt_pbmc: string | null
          sex: string | null
          stain_f_cells: string | null
          steady_state: string | null
          subject_id: string
          therapies: string | null
          transfusion_confirmed: string | null
          transfusion_status: string | null
          updated_at: string | null
          visc_225: number | null
          visc_45: number | null
          vol_plasma_1: number | null
          vol_plasma_2: number | null
          vol_plasma_3: number | null
          wbc_advia: number | null
        }
        Insert: {
          age_at_collection?: number | null
          cell_number_1_pbmc?: number | null
          cell_number_2_pbmc?: number | null
          cells_adhered_adhesion?: number | null
          chr_advia?: number | null
          concentration_1_dna?: number | null
          concentration_2_dna?: number | null
          created_at?: string | null
          cytometer_f_cells?: string | null
          date_adhesion?: string | null
          date_advia?: string | null
          date_dna?: string | null
          date_f_cells?: string | null
          date_hplc?: string | null
          date_hvr?: string | null
          date_lorrca?: string | null
          date_of_collection?: string | null
          date_plasma?: string | null
          date_pmbc?: string | null
          date_visc?: string | null
          days_to_processing?: number | null
          drbc_advia?: number | null
          ei_delta_lorrca?: number | null
          ei_max_lorrca?: number | null
          ei_min_lorrca?: number | null
          genotype?: string | null
          hb_advia?: number | null
          hba_percent_d10_hplc?: number | null
          hba_percent_grady_hplc?: number | null
          hba2_percent_d10_hplc?: number | null
          hba2_percent_grady_hplc?: number | null
          hbc_percent_d10_hplc?: number | null
          hbc_percent_grady_hplc?: number | null
          hbf_percent_d10_fcell_ratio?: number | null
          hbf_percent_d10_hplc?: number | null
          hbf_percent_grady_fcell_ratio?: number | null
          hbf_percent_grady_hplc?: number | null
          hbs_percent_d10_hplc?: number | null
          hbs_percent_grady_hplc?: number | null
          hc41_v120_advia?: number | null
          hc41_v60_120_advia?: number | null
          hc41_v60_advia?: number | null
          hct_advia?: number | null
          hdw_advia?: number | null
          hvr_225?: number | null
          hvr_45?: number | null
          hyper_advia?: number | null
          id: string
          instrument_lorrca?: string | null
          mch_advia?: number | null
          mchc_advia?: number | null
          mcv_advia?: number | null
          mpv_advia?: number | null
          neut_advia?: number | null
          nrbc_advia?: number | null
          percent_f_cells?: number | null
          plt_advia?: number | null
          pos_lorrca?: number | null
          project?: string | null
          purity_1_dna?: number | null
          purity_2_dna?: number | null
          qc_notes_adhesion?: string | null
          qc_notes_advia?: string | null
          qc_notes_dna?: string | null
          qc_notes_f_cells?: string | null
          qc_notes_hvr?: string | null
          qc_notes_lorrca?: string | null
          qc_notes_pbmc?: string | null
          qc_notes_plasma?: string | null
          qc_notes_viscosity?: string | null
          qc_pass_adhesion?: string | null
          qc_pass_advia?: string | null
          qc_pass_dna?: string | null
          qc_pass_f_cells?: string | null
          qc_pass_hvr?: string | null
          qc_pass_lorrca?: string | null
          qc_pass_viscosity?: string | null
          rbc_advia?: number | null
          rdw_advia?: number | null
          retic_advia?: number | null
          sample_id: string
          sample_number: number
          sent_to_gt_pbmc?: string | null
          sex?: string | null
          stain_f_cells?: string | null
          steady_state?: string | null
          subject_id: string
          therapies?: string | null
          transfusion_confirmed?: string | null
          transfusion_status?: string | null
          updated_at?: string | null
          visc_225?: number | null
          visc_45?: number | null
          vol_plasma_1?: number | null
          vol_plasma_2?: number | null
          vol_plasma_3?: number | null
          wbc_advia?: number | null
        }
        Update: {
          age_at_collection?: number | null
          cell_number_1_pbmc?: number | null
          cell_number_2_pbmc?: number | null
          cells_adhered_adhesion?: number | null
          chr_advia?: number | null
          concentration_1_dna?: number | null
          concentration_2_dna?: number | null
          created_at?: string | null
          cytometer_f_cells?: string | null
          date_adhesion?: string | null
          date_advia?: string | null
          date_dna?: string | null
          date_f_cells?: string | null
          date_hplc?: string | null
          date_hvr?: string | null
          date_lorrca?: string | null
          date_of_collection?: string | null
          date_plasma?: string | null
          date_pmbc?: string | null
          date_visc?: string | null
          days_to_processing?: number | null
          drbc_advia?: number | null
          ei_delta_lorrca?: number | null
          ei_max_lorrca?: number | null
          ei_min_lorrca?: number | null
          genotype?: string | null
          hb_advia?: number | null
          hba_percent_d10_hplc?: number | null
          hba_percent_grady_hplc?: number | null
          hba2_percent_d10_hplc?: number | null
          hba2_percent_grady_hplc?: number | null
          hbc_percent_d10_hplc?: number | null
          hbc_percent_grady_hplc?: number | null
          hbf_percent_d10_fcell_ratio?: number | null
          hbf_percent_d10_hplc?: number | null
          hbf_percent_grady_fcell_ratio?: number | null
          hbf_percent_grady_hplc?: number | null
          hbs_percent_d10_hplc?: number | null
          hbs_percent_grady_hplc?: number | null
          hc41_v120_advia?: number | null
          hc41_v60_120_advia?: number | null
          hc41_v60_advia?: number | null
          hct_advia?: number | null
          hdw_advia?: number | null
          hvr_225?: number | null
          hvr_45?: number | null
          hyper_advia?: number | null
          id?: string
          instrument_lorrca?: string | null
          mch_advia?: number | null
          mchc_advia?: number | null
          mcv_advia?: number | null
          mpv_advia?: number | null
          neut_advia?: number | null
          nrbc_advia?: number | null
          percent_f_cells?: number | null
          plt_advia?: number | null
          pos_lorrca?: number | null
          project?: string | null
          purity_1_dna?: number | null
          purity_2_dna?: number | null
          qc_notes_adhesion?: string | null
          qc_notes_advia?: string | null
          qc_notes_dna?: string | null
          qc_notes_f_cells?: string | null
          qc_notes_hvr?: string | null
          qc_notes_lorrca?: string | null
          qc_notes_pbmc?: string | null
          qc_notes_plasma?: string | null
          qc_notes_viscosity?: string | null
          qc_pass_adhesion?: string | null
          qc_pass_advia?: string | null
          qc_pass_dna?: string | null
          qc_pass_f_cells?: string | null
          qc_pass_hvr?: string | null
          qc_pass_lorrca?: string | null
          qc_pass_viscosity?: string | null
          rbc_advia?: number | null
          rdw_advia?: number | null
          retic_advia?: number | null
          sample_id?: string
          sample_number?: number
          sent_to_gt_pbmc?: string | null
          sex?: string | null
          stain_f_cells?: string | null
          steady_state?: string | null
          subject_id?: string
          therapies?: string | null
          transfusion_confirmed?: string | null
          transfusion_status?: string | null
          updated_at?: string | null
          visc_225?: number | null
          visc_45?: number | null
          vol_plasma_1?: number | null
          vol_plasma_2?: number | null
          vol_plasma_3?: number | null
          wbc_advia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "omics_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "omics_subjects"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      omics_subjects: {
        Row: {
          created_at: string | null
          patient_mrn: string | null
          project: string
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          patient_mrn?: string | null
          project?: string
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          patient_mrn?: string | null
          project?: string
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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

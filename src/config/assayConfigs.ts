import {
  results_dnaInLaboratory,
  results_plasmaInLaboratory,
  results_pbmcInLaboratory,
  results_adhesionInLaboratory,
  results_adviaInLaboratory,
  results_fcellsInLaboratory,
  results_lorrcaInLaboratory,
  results_viscosityInLaboratory,
} from "@/lib/db/schema";
import type { PgTable } from "drizzle-orm/pg-core";

export interface AssayFieldConfig {
  name: string; // Corresponds to the column name in the database table
  label: string; // User-friendly label for the grid header
  type: "text" | "number" | "date" | "select" | "boolean"; // Input type for the grid cell
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ value: string | number | boolean; label: string }>; // For 'select' type
  validation?: (value: any) => string | null; // Optional custom validation function
  placeholder?: string;
  disabled?: boolean;
}

export interface AssayConfig {
  displayName: string;
  dbTable: PgTable; // Using PgTable for a more specific Drizzle table type
  primaryKeyInDb: string; // e.g., 'id'
  sampleIdForeignKey: string; // e.g., 'sample_id'
  fields: AssayFieldConfig[];
}

const QC_PASS_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "N/A", label: "N/A" },
];

export const ASSAY_CONFIGS: { [assayKey: string]: AssayConfig } = {
  dna: {
    displayName: "DNA Results",
    dbTable: results_dnaInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      { name: "date_dna", label: "DNA Date", type: "date", required: true },
      { name: "concentration_1_dna", label: "Conc. 1 (ng/uL)", type: "number", placeholder: "e.g., 50.0" },
      { name: "purity_1_dna", label: "Purity 1 (260/280)", type: "number", placeholder: "e.g., 1.8" },
      { name: "concentration_2_dna", label: "Conc. 2 (ng/uL)", type: "number", placeholder: "e.g., 48.0" },
      { name: "purity_2_dna", label: "Purity 2 (260/280)", type: "number", placeholder: "e.g., 1.9" },
      { name: "qc_pass_dna", label: "QC Pass", type: "select", options: QC_PASS_OPTIONS },
      { name: "qc_notes_dna", label: "QC Notes", type: "text", placeholder: "Optional notes" },
    ],
  },
  advia: {
    displayName: "Advia CBC",
    dbTable: results_adviaInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      { name: "date_advia", label: "Advia Date", type: "date", required: true },
      { name: "rbc_advia", label: "RBC", type: "number" },
      { name: "hb_advia", label: "Hb", type: "number" },
      { name: "hct_advia", label: "Hct", type: "number" },
      { name: "mcv_advia", label: "MCV", type: "number" },
      { name: "mch_advia", label: "MCH", type: "number" },
      { name: "mchc_advia", label: "MCHC", type: "number" },
      { name: "rdw_advia", label: "RDW", type: "number" },
      { name: "hdw_advia", label: "HDW", type: "number" },
      { name: "plt_advia", label: "PLT", type: "number" },
      { name: "mpv_advia", label: "MPV", type: "number" },
      { name: "wbc_advia", label: "WBC", type: "number" },
      { name: "neut_advia", label: "Neut #", type: "number" }, // Assuming absolute count
      { name: "retic_advia", label: "Retic #", type: "number" }, // Assuming absolute count
      { name: "chr_advia", label: "CHr", type: "number" },
      // Note: hc41_v fields might need more specific labels if their meaning is known
      { name: "hc41_v120_advia", label: "HC41 V120", type: "number" }, 
      { name: "hc41_v60_120_advia", label: "HC41 V60-120", type: "number" },
      { name: "hc41_v60_advia", label: "HC41 V60", type: "number" },
      { name: "drbc_advia", label: "DRBC", type: "number" },
      { name: "hyper_advia", label: "Hyper", type: "number" },
      { name: "nrbc_advia", label: "NRBC", type: "number" },
      { name: "qc_pass_advia", label: "QC Pass", type: "select", options: QC_PASS_OPTIONS },
      { name: "qc_notes_advia", label: "QC Notes", type: "text" },
    ],
  },
  plasma: {
    displayName: "Plasma Aliquots",
    dbTable: results_plasmaInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      { name: "date_plasma", label: "Plasma Date", type: "date", required: true },
      { name: "vol_plasma_1", label: "Vol Plasma 1 (mL)", type: "number" },
      { name: "vol_plasma_2", label: "Vol Plasma 2 (mL)", type: "number" },
      { name: "vol_plasma_3", label: "Vol Plasma 3 (mL)", type: "number" },
      { name: "qc_notes_plasma", label: "QC Notes", type: "text" },
    ],
  },
  pbmc: {
    displayName: "PBMC Processing",
    dbTable: results_pbmcInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      { name: "date_pbmc", label: "PBMC Date", type: "date", required: true },
      { name: "cell_number_1_pbmc", label: "Cell #1", type: "number" },
      { name: "cell_number_2_pbmc", label: "Cell #2", type: "number" },
      { name: "sent_to_gt_pbmc", label: "Sent to GT?", type: "number" }, // Consider if this should be boolean/select
      { name: "qc_notes_pbmc", label: "QC Notes", type: "text" },
    ],
  },
  adhesion: {
    displayName: "Adhesion Assay",
    dbTable: results_adhesionInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      { name: "date_adhesion", label: "Adhesion Date", type: "date", required: true },
      { name: "cells_adhered_adhesion", label: "Cells Adhered", type: "number" },
      { name: "qc_pass_adhesion", label: "QC Pass", type: "select", options: QC_PASS_OPTIONS },
      { name: "qc_notes_adhesion", label: "QC Notes", type: "text" },
    ],
  },
  fcells: {
    displayName: "F-Cell Analysis",
    dbTable: results_fcellsInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      { name: "date_f_cells", label: "F-Cell Date", type: "date", required: true },
      { name: "percent_f_cells", label: "% F-Cells", type: "number" },
      { name: "stain_f_cells", label: "Stain Used", type: "text" },
      { name: "cytometer_f_cells", label: "Cytometer", type: "text" },
      { name: "qc_pass_f_cells", label: "QC Pass", type: "select", options: QC_PASS_OPTIONS },
      { name: "qc_notes_f_cells", label: "QC Notes", type: "text" },
    ],
  },
  lorrca: {
    displayName: "LORRCA Ektacytometry",
    dbTable: results_lorrcaInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      { name: "date_lorrca", label: "LORRCA Date", type: "date", required: true },
      { name: "ei_min_lorrca", label: "EI Min", type: "number" },
      { name: "ei_max_lorrca", label: "EI Max", type: "number" },
      { name: "ei_delta_lorrca", label: "EI Delta", type: "number" },
      { name: "pos_lorrca", label: "POS", type: "text" }, // Or number if it's always numeric
      { name: "instrument_lorrca", label: "Instrument", type: "text" },
      { name: "qc_pass_lorrca", label: "QC Pass", type: "select", options: QC_PASS_OPTIONS },
      { name: "qc_notes_lorrca", label: "QC Notes", type: "text" },
    ],
  },
  viscosity: {
    displayName: "Viscosity Measurement",
    dbTable: results_viscosityInLaboratory,
    primaryKeyInDb: "id",
    sampleIdForeignKey: "sample_id",
    fields: [
      // Schema has date_analysis, but common pattern is date_ASSAYNAME
      { name: "date_analysis", label: "Analysis Date", type: "date", required: true }, 
      { name: "visc_45", label: "Visc @ 45 s⁻¹", type: "number" },
      { name: "visc_225", label: "Visc @ 225 s⁻¹", type: "number" },
      // Schema has hvr_45 and hvr_225, these might be from a different HVR assay or part of viscosity.
      // Clarify if HVR fields belong here or in a separate HVR assay config.
      // For now, assuming they are part of viscosity results as per schema structure for results_viscosity.
      { name: "hvr_45", label: "HVR @ 45 s⁻¹", type: "number" },
      { name: "hvr_225", label: "HVR @ 225 s⁻¹", type: "number" }, 
      { name: "qc_pass", label: "QC Pass", type: "select", options: QC_PASS_OPTIONS },
      { name: "qc_notes", label: "QC Notes", type: "text" },
    ],
  },
  // Add other assay configurations here as needed
}; 
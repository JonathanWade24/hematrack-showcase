import { relations } from "drizzle-orm/relations";
import { lab_ordersInClinical, lab_resultsInClinical, bone_marrow_resultsInClinical, samplesInLaboratory, results_dnaInLaboratory, results_plasmaInLaboratory, results_pbmcInLaboratory, results_adhesionInLaboratory, omics_subjectsInLaboratory, subject_registrationInClinical, patientsInClinical, visitsInClinical, medication_ordersInClinical, results_adviaInLaboratory, results_fcellsInLaboratory, results_lorrcaInLaboratory, results_viscosityInLaboratory, medication_administrationsInClinical, fact_bone_marrow_orderInClinical, fact_bone_marrow_componentInClinical, visit_diagnosesInClinical, UserInApp, AccountInApp, SessionInApp } from "./schema";

export const lab_resultsInClinicalRelations = relations(lab_resultsInClinical, ({one}) => ({
	lab_ordersInClinical: one(lab_ordersInClinical, {
		fields: [lab_resultsInClinical.order_id],
		references: [lab_ordersInClinical.order_id]
	}),
}));

export const lab_ordersInClinicalRelations = relations(lab_ordersInClinical, ({one, many}) => ({
	lab_resultsInClinicals: many(lab_resultsInClinical),
	bone_marrow_resultsInClinicals: many(bone_marrow_resultsInClinical),
	patientsInClinical: one(patientsInClinical, {
		fields: [lab_ordersInClinical.patient_mrn],
		references: [patientsInClinical.patient_mrn]
	}),
	visitsInClinical: one(visitsInClinical, {
		fields: [lab_ordersInClinical.visit_id],
		references: [visitsInClinical.visit_id]
	}),
}));

export const bone_marrow_resultsInClinicalRelations = relations(bone_marrow_resultsInClinical, ({one}) => ({
	lab_ordersInClinical: one(lab_ordersInClinical, {
		fields: [bone_marrow_resultsInClinical.order_id],
		references: [lab_ordersInClinical.order_id]
	}),
}));

export const results_dnaInLaboratoryRelations = relations(results_dnaInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_dnaInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const samplesInLaboratoryRelations = relations(samplesInLaboratory, ({one, many}) => ({
	results_dnaInLaboratories: many(results_dnaInLaboratory),
	results_plasmaInLaboratories: many(results_plasmaInLaboratory),
	results_pbmcInLaboratories: many(results_pbmcInLaboratory),
	results_adhesionInLaboratories: many(results_adhesionInLaboratory),
	omics_subjectsInLaboratory: one(omics_subjectsInLaboratory, {
		fields: [samplesInLaboratory.subject_id],
		references: [omics_subjectsInLaboratory.subject_id]
	}),
	results_adviaInLaboratories: many(results_adviaInLaboratory),
	results_fcellsInLaboratories: many(results_fcellsInLaboratory),
	results_lorrcaInLaboratories: many(results_lorrcaInLaboratory),
	results_viscosityInLaboratories: many(results_viscosityInLaboratory),
}));

export const results_plasmaInLaboratoryRelations = relations(results_plasmaInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_plasmaInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const results_pbmcInLaboratoryRelations = relations(results_pbmcInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_pbmcInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const results_adhesionInLaboratoryRelations = relations(results_adhesionInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_adhesionInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const omics_subjectsInLaboratoryRelations = relations(omics_subjectsInLaboratory, ({one, many}) => ({
	samplesInLaboratories: many(samplesInLaboratory),
	subject_registrationInClinicals: many(subject_registrationInClinical),
	patientsInClinical: one(patientsInClinical, {
		fields: [omics_subjectsInLaboratory.patient_mrn],
		references: [patientsInClinical.patient_mrn]
	}),
}));

export const subject_registrationInClinicalRelations = relations(subject_registrationInClinical, ({one}) => ({
	omics_subjectsInLaboratory: one(omics_subjectsInLaboratory, {
		fields: [subject_registrationInClinical.subject_id],
		references: [omics_subjectsInLaboratory.subject_id]
	}),
	patientsInClinical: one(patientsInClinical, {
		fields: [subject_registrationInClinical.patient_mrn],
		references: [patientsInClinical.patient_mrn]
	}),
}));

export const patientsInClinicalRelations = relations(patientsInClinical, ({many}) => ({
	subject_registrationInClinicals: many(subject_registrationInClinical),
	medication_ordersInClinicals: many(medication_ordersInClinical),
	visitsInClinicals: many(visitsInClinical),
	medication_administrationsInClinicals: many(medication_administrationsInClinical),
	lab_ordersInClinicals: many(lab_ordersInClinical),
}));

export const medication_ordersInClinicalRelations = relations(medication_ordersInClinical, ({one}) => ({
	visitsInClinical: one(visitsInClinical, {
		fields: [medication_ordersInClinical.visit_id],
		references: [visitsInClinical.visit_id]
	}),
	patientsInClinical: one(patientsInClinical, {
		fields: [medication_ordersInClinical.patient_mrn],
		references: [patientsInClinical.patient_mrn]
	}),
}));

export const visitsInClinicalRelations = relations(visitsInClinical, ({one, many}) => ({
	medication_ordersInClinicals: many(medication_ordersInClinical),
	patientsInClinical: one(patientsInClinical, {
		fields: [visitsInClinical.patient_mrn],
		references: [patientsInClinical.patient_mrn]
	}),
	medication_administrationsInClinicals: many(medication_administrationsInClinical),
	visit_diagnosesInClinicals: many(visit_diagnosesInClinical),
	lab_ordersInClinicals: many(lab_ordersInClinical),
}));

export const results_adviaInLaboratoryRelations = relations(results_adviaInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_adviaInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const results_fcellsInLaboratoryRelations = relations(results_fcellsInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_fcellsInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const results_lorrcaInLaboratoryRelations = relations(results_lorrcaInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_lorrcaInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const results_viscosityInLaboratoryRelations = relations(results_viscosityInLaboratory, ({one}) => ({
	samplesInLaboratory: one(samplesInLaboratory, {
		fields: [results_viscosityInLaboratory.sample_id],
		references: [samplesInLaboratory.sample_id]
	}),
}));

export const medication_administrationsInClinicalRelations = relations(medication_administrationsInClinical, ({one}) => ({
	visitsInClinical: one(visitsInClinical, {
		fields: [medication_administrationsInClinical.visit_id],
		references: [visitsInClinical.visit_id]
	}),
	patientsInClinical: one(patientsInClinical, {
		fields: [medication_administrationsInClinical.patient_mrn],
		references: [patientsInClinical.patient_mrn]
	}),
}));

export const fact_bone_marrow_componentInClinicalRelations = relations(fact_bone_marrow_componentInClinical, ({one}) => ({
	fact_bone_marrow_orderInClinical: one(fact_bone_marrow_orderInClinical, {
		fields: [fact_bone_marrow_componentInClinical.bone_marrow_order_key],
		references: [fact_bone_marrow_orderInClinical.bone_marrow_order_key]
	}),
}));

export const fact_bone_marrow_orderInClinicalRelations = relations(fact_bone_marrow_orderInClinical, ({many}) => ({
	fact_bone_marrow_componentInClinicals: many(fact_bone_marrow_componentInClinical),
}));

export const visit_diagnosesInClinicalRelations = relations(visit_diagnosesInClinical, ({one}) => ({
	visitsInClinical: one(visitsInClinical, {
		fields: [visit_diagnosesInClinical.visit_id],
		references: [visitsInClinical.visit_id]
	}),
}));

export const AccountInAppRelations = relations(AccountInApp, ({one}) => ({
	UserInApp: one(UserInApp, {
		fields: [AccountInApp.userId],
		references: [UserInApp.id]
	}),
}));

export const UserInAppRelations = relations(UserInApp, ({many}) => ({
	AccountInApps: many(AccountInApp),
	SessionInApps: many(SessionInApp),
}));

export const SessionInAppRelations = relations(SessionInApp, ({one}) => ({
	UserInApp: one(UserInApp, {
		fields: [SessionInApp.userId],
		references: [UserInApp.id]
	}),
}));
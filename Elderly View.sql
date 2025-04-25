-- 1. Drop existing view if it exists
DROP VIEW IF EXISTS vw_omics_results;

-- 2. Create the view, then introduce the CTE chain
CREATE OR REPLACE VIEW vw_omics_results AS
WITH
  -- Determine the 90-day window around omics collections
  parameters AS (
    SELECT
      MIN(o.date_of_collection) AS first_date,
      MAX(o.date_of_collection) AS last_date
    FROM laboratory.omics_results o
  ),
  date_window AS (
    SELECT
      first_date - INTERVAL '90 days' AS window_start,
      last_date  + INTERVAL '90 days' AS window_end
    FROM parameters
  ),

  -- Full list of SCD-related ICD-10 codes
  scd_codes AS (
    SELECT UNNEST(ARRAY[
      'D57.00','D57.01','D57.02','D57.20','D57.211','D57.212','D57.219',
      'D57.40','D57.411','D57.412','D57.419','D57.80','D57.811','D57.812',
      'D57.819','J96.00','J96.01','J96.02','J18.9','J81.0','R07.1',
      'R07.89','R09.02','R06.02','R50.9'
    ]) AS code
  ),

  -- Identify any duplicate subject_id + date_of_collection
  duplicates AS (
    SELECT
      s.subject_id,
      o.date_of_collection,
      COUNT(*) AS cnt
    FROM laboratory.omics_subjects s
    JOIN laboratory.omics_results o USING(subject_id)
    GROUP BY s.subject_id, o.date_of_collection
    HAVING COUNT(*) > 1
  ),

  -- Filter & normalize omics data
  filtered_omics AS (
    SELECT 
      o.subject_id,
      o.sample_id,
      o.date_of_collection,
      CASE
        WHEN o.genotype IN (
          'SS','SS- Lepore','SS/HPFH','Sbet0','Sbeta 0','SBet0/HPFH'
        ) THEN 'SS'
        ELSE o.genotype
      END AS genotype,
      o.hb_advia,
      o.hct_advia,
      o.mcv_advia,
      o.mchc_advia,
      o.wbc_advia,
      o.neut_advia,
      o.plt_advia,
      o.retic_advia,
      o.rbc_advia,
      o.drbc_advia,
      o.ei_min_lorrca,
      o.ei_max_lorrca,
      o.pos_lorrca,
      o.qc_pass_lorrca,
      o.instrument_lorrca,
      o.percent_f_cells,
      o.visc_45,
      o.visc_225,
      o.hvr_45,
      o.hvr_225
    FROM laboratory.omics_results o
    WHERE o.rbc_advia       IS NOT NULL
      AND o.ei_max_lorrca    IS NOT NULL
      AND o.ei_max_lorrca   <> 'NaN'
      AND o.genotype IN (
        'SS','SC','SS- Lepore','Sbet0','SS/HPFH','SBet0/HPFH','Sbeta0','Sbeta 0','Sbeta+'
      )
  ),

  -- Pull relevant labs in the window
  relevant_labs AS (
    SELECT 
      l.patient_mrn,
      l.result_time    AS lab_date,
      l.lab_component_description,
      l.lab_result_value
    FROM clinical."Labs" l
    JOIN date_window w ON TRUE
    WHERE l.lab_result_value IS NOT NULL
      AND l.lab_result_value <> 'NaN'
      AND l.result_time BETWEEN w.window_start AND w.window_end
      AND (
        LOWER(l.lab_component_description) LIKE '%hgb%'
        OR LOWER(l.lab_component_description) LIKE '%hemoglobin%'
        OR LOWER(l.lab_component_description) LIKE '%ldh%'
        OR LOWER(l.lab_component_description) LIKE '%creatinine%'
        OR LOWER(l.lab_component_description) LIKE '%protein/cr%'
        OR LOWER(l.lab_component_description) LIKE '%bilirubin%'
        OR LOWER(l.lab_component_description) LIKE '%ferritin%'
        OR LOWER(l.lab_component_description) LIKE '%vitamin d%'
        OR LOWER(l.lab_component_description) LIKE '%25-oh%'
      )
  ),

  -- Extract HPLC labs (Hb F/A2/A/S/C)
  hplc_labs AS (
    SELECT 
      rl.patient_mrn,
      rl.lab_date,
      CASE 
        WHEN LOWER(rl.lab_component_description) LIKE '%hgb f%'                THEN 'hbf'
        WHEN LOWER(rl.lab_component_description) LIKE '%hemoglobin f%'         THEN 'hbf'
        WHEN LOWER(rl.lab_component_description) LIKE '%hgb a2%'               THEN 'hba2'
        WHEN LOWER(rl.lab_component_description) LIKE '%hemoglobin a2%'        THEN 'hba2'
        WHEN (LOWER(rl.lab_component_description) LIKE '%hgb a%' 
              OR LOWER(rl.lab_component_description) LIKE '%hemoglobin a%')
             AND NOT LOWER(rl.lab_component_description) LIKE '%a2%'           THEN 'hba'
        WHEN LOWER(rl.lab_component_description) LIKE '%hgb s%'                THEN 'hbs'
        WHEN LOWER(rl.lab_component_description) LIKE '%hemoglobin s%'         THEN 'hbs'
        WHEN LOWER(rl.lab_component_description) LIKE '%hgb c%'                THEN 'hbc'
        WHEN LOWER(rl.lab_component_description) LIKE '%hemoglobin c%'         THEN 'hbc'
      END AS hplc_type,
      rl.lab_result_value
    FROM relevant_labs rl
    WHERE LOWER(rl.lab_component_description) LIKE '%hgb%'
  ),

  -- Extract other labs
  other_labs AS (
    SELECT 
      rl.patient_mrn,
      rl.lab_date,
      CASE
        WHEN LOWER(rl.lab_component_description) LIKE '%ldh%'                                         THEN 'ldh'
        WHEN LOWER(rl.lab_component_description) LIKE '%creatinine%'                                  THEN 'creatinine'
        WHEN LOWER(rl.lab_component_description) LIKE '%protein/cr%'                                  THEN 'urine_protein_cr'
        WHEN LOWER(rl.lab_component_description) LIKE '%protein to creatinine%'                       THEN 'urine_protein_cr'
        WHEN LOWER(rl.lab_component_description) IN (
          'albumin/creatinine index',
          'albumin/creatinine ratio',
          'microalb/creat ratio-labcorp',
          'microalbumin, urine-labcorp',
          'microalbumin/creatinine ratio,random-quest'
        )                                                                                            THEN 'urine_albumin_cr'
        WHEN LOWER(rl.lab_component_description) = 'bilirubin,total-serum'                           THEN 'total_bili_serum'
        WHEN LOWER(rl.lab_component_description) = 'bilirubin, total-labcorp'                       THEN 'total_bili_labcorp'
        WHEN LOWER(rl.lab_component_description) = 'bilirubin, total-quest'                         THEN 'total_bili_quest'
        WHEN LOWER(rl.lab_component_description) = 'bilirubin-labcorp'                               THEN 'bili_labcorp'
        WHEN LOWER(rl.lab_component_description) = 'bilirubin,direct-serum'                         THEN 'direct_bili'
        WHEN LOWER(rl.lab_component_description) = 'bilirubin, qualitative-urine'                   THEN 'urine_bili'
        WHEN LOWER(rl.lab_component_description) LIKE '%ferritin%'                                   THEN 'ferritin'
        WHEN LOWER(rl.lab_component_description) LIKE '%vitamin d%'                                  THEN 'vitamin_d'
        WHEN LOWER(rl.lab_component_description) LIKE '%25-oh, total%'                               THEN 'vitamin_d'
        WHEN LOWER(rl.lab_component_description) LIKE '%25-hydroxy, total%'                          THEN 'vitamin_d'
      END AS lab_category,
      rl.lab_result_value
    FROM relevant_labs rl
  ),

  -- Latest value per lab category
  latest_labs AS (
    SELECT 
      patient_mrn,
      MAX(CASE WHEN lab_category = 'ldh'              THEN lab_result_value END) AS ldh,
      MAX(CASE WHEN lab_category = 'creatinine'       THEN lab_result_value END) AS creatinine,
      MAX(CASE WHEN lab_category = 'urine_protein_cr' THEN lab_result_value END) AS urine_protein_cr,
      MAX(CASE WHEN lab_category = 'urine_albumin_cr' THEN lab_result_value END) AS urine_albumin_cr,
      MAX(CASE WHEN lab_category = 'total_bili_serum' THEN lab_result_value END) AS total_bili_serum,
      MAX(CASE WHEN lab_category = 'total_bili_labcorp' THEN lab_result_value END) AS total_bili_labcorp,
      MAX(CASE WHEN lab_category = 'total_bili_quest'   THEN lab_result_value END) AS total_bili_quest,
      MAX(CASE WHEN lab_category = 'bili_labcorp'       THEN lab_result_value END) AS bili_labcorp,
      MAX(CASE WHEN lab_category = 'direct_bili'        THEN lab_result_value END) AS direct_bili,
      MAX(CASE WHEN lab_category = 'urine_bili'         THEN lab_result_value END) AS urine_bili,
      MAX(CASE WHEN lab_category = 'ferritin'          THEN lab_result_value END) AS ferritin,
      MAX(CASE WHEN lab_category = 'vitamin_d'         THEN lab_result_value END) AS vitamin_d
    FROM other_labs
    WHERE lab_category IS NOT NULL
    GROUP BY patient_mrn
  ),

  -- HPLC before & after for each collection
  hplc_before_after AS (
    SELECT DISTINCT
      h.patient_mrn,
      h.hplc_type,
      o.date_of_collection,
      FIRST_VALUE(h.lab_result_value) OVER (
        PARTITION BY h.patient_mrn, h.hplc_type, o.date_of_collection
        ORDER BY 
          CASE WHEN h.lab_date <= o.date_of_collection THEN h.lab_date END DESC NULLS LAST
      ) AS value_before,
      FIRST_VALUE(h.lab_date) OVER (
        PARTITION BY h.patient_mrn, h.hplc_type, o.date_of_collection
        ORDER BY 
          CASE WHEN h.lab_date <= o.date_of_collection THEN h.lab_date END DESC NULLS LAST
      ) AS date_before,
      FIRST_VALUE(h.lab_result_value) OVER (
        PARTITION BY h.patient_mrn, h.hplc_type, o.date_of_collection
        ORDER BY 
          CASE WHEN h.lab_date > o.date_of_collection THEN h.lab_date END ASC NULLS LAST
      ) AS value_after,
      FIRST_VALUE(h.lab_date) OVER (
        PARTITION BY h.patient_mrn, h.hplc_type, o.date_of_collection
        ORDER BY 
          CASE WHEN h.lab_date > o.date_of_collection THEN h.lab_date END ASC NULLS LAST
      ) AS date_after
    FROM hplc_labs h
    JOIN laboratory.omics_subjects s ON h.patient_mrn = s.patient_mrn
    JOIN filtered_omics o ON s.subject_id = o.subject_id
  ),

  -- Nearest outpatient visit weight
  nearest_op_visit AS (
    SELECT DISTINCT
      s.patient_mrn,
      o.date_of_collection,
      FIRST_VALUE(v.weight_kg) OVER (
      PARTITION BY s.patient_mrn, o.date_of_collection
      ORDER BY ABS(EXTRACT(EPOCH FROM (v.visit_date - o.date_of_collection)))
    ) AS weight_kg,
    FIRST_VALUE(v.visit_date) OVER (
      PARTITION BY s.patient_mrn, o.date_of_collection
      ORDER BY ABS(EXTRACT(EPOCH FROM (v.visit_date - o.date_of_collection)))
    ) AS op_visit_date
    FROM laboratory.omics_subjects s
    JOIN filtered_omics o ON s.subject_id = o.subject_id
    JOIN clinical.op_visits v ON s.patient_mrn = v.patient_mrn
    WHERE v.weight_kg IS NOT NULL
  ),

  -- VoE admissions using scd_codes
  voe_admissions AS (
    SELECT DISTINCT
      a.patient_mrn,
      a.adm_date_time
    FROM clinical.ip_admissions a
    JOIN scd_codes c ON
      a.admit_dx_cd_1 = c.code
      OR a.admit_dx_cd_2 = c.code
      OR a.final_dx_cd_1 = c.code
      OR a.final_dx_cd_2 = c.code
      OR a.final_dx_cd_3 = c.code
      OR a.final_dx_cd_4 = c.code
      OR a.final_dx_cd_5 = c.code
  ),

  -- Time from nearest VoE
  nearest_voe AS (
    SELECT 
      s.patient_mrn,
      o.date_of_collection,
    FIRST_VALUE(
      ABS(EXTRACT(EPOCH FROM (o.date_of_collection - a.adm_date_time))) / 86400.0
    ) OVER (
      PARTITION BY s.patient_mrn, o.date_of_collection
      ORDER BY ABS(EXTRACT(EPOCH FROM (o.date_of_collection - a.adm_date_time)))
    ) AS time_from_voe
    FROM laboratory.omics_subjects s
    JOIN filtered_omics o ON s.subject_id = o.subject_id
    LEFT JOIN voe_admissions a ON s.patient_mrn = a.patient_mrn
  ),

  -- OP medications (including vitamin D)
  medications AS (
    SELECT 
      m.patient_mrn,
      MAX(CASE WHEN LOWER(m.generic_description) LIKE '%hydroxyurea%' THEN 'Yes' END)                                  AS op_hydroxyurea_status,
      MAX(CASE WHEN m.generic_description = 'HYDROXYUREA 400 MG PO CAPS' THEN m.generic_description END)               AS hydroxyurea_400mg,
      MAX(CASE WHEN m.generic_description = 'HYDROXYUREA 500 MG PO CAPS' THEN m.generic_description END)               AS hydroxyurea_500mg,
      MAX(CASE WHEN m.generic_description = 'HYDROXYUREA ORAL SOLN 100 MG/ML' THEN m.generic_description END)          AS hydroxyurea_solution,
      MAX(CASE WHEN LOWER(m.generic_description) LIKE '%voxelotor%' OR LOWER(m.generic_description) LIKE '%oxbryta%' THEN 'Yes' END) AS op_voxelotor_status,
      MAX(CASE WHEN m.generic_description = 'OXBRYTA 500 MG PO TABS' THEN m.generic_description END)                   AS oxbryta_500mg,
      MAX(CASE WHEN m.generic_description = 'VOXELOTOR 500 MG PO TABS' THEN m.generic_description END)                AS voxelotor_500mg,
      MAX(CASE WHEN LOWER(m.generic_description) LIKE '%glutamine%' THEN 'Yes' END)                                   AS op_glutamine_status,
      MAX(CASE WHEN m.generic_description = 'GLUTAMINE (SICKLE CELL) 5 G PO PACK' THEN m.generic_description END)      AS glutamine_5g,
      CASE 
        WHEN BOOL_OR(m.generic_description IN (
          'VITAMIN A & D 10000-400 UNITS PO TABS',
          'VITAMIN D (CHOLECALCIFEROL) 25 MCG (1000 UT) PO TABS',
          'VITAMIN D (ERGOCALCIFEROL) 1.25 MG (50000 UT) PO CAPS',
          'VITAMIN D 1000 UNITS PO CAPS',
          'VITAMIN D 1000 UNITS PO TABS',
          'VITAMIN D 50 MCG (2000 UT) PO CAPS',
          'VITAMIN D PO',
          'VITAMIN D3 25 MCG (1000 UT) PO CAPS',
          'VITAMIN D3 50 MCG (2000 UT) PO CAPS',
          'VITAMIN D3 75 MCG (3000 UT) PO TABS'
        )) THEN 1 ELSE 0
      END                                                                                                                                       AS vit_d_supplement
    FROM clinical.op_medications m
    JOIN date_window w ON TRUE
    WHERE m.visit_date BETWEEN w.window_start AND w.window_end
    GROUP BY m.patient_mrn
  ),

  -- IP medications
  ip_medications AS (
    SELECT 
      m.patient_mrn,
      MAX(CASE WHEN LOWER(m.medication) LIKE '%hydroxyurea%' THEN 'Yes' END)                                  AS ip_hydroxyurea_status,
      MAX(CASE WHEN LOWER(m.medication) LIKE '%voxelotor%' OR LOWER(m.medication) LIKE '%oxbryta%' THEN 'Yes' END) AS ip_voxelotor_status,
      MAX(CASE WHEN LOWER(m.medication) LIKE '%glutamine%' THEN 'Yes' END)                                        AS ip_glutamine_status
    FROM clinical.ip_medications m
    JOIN date_window w ON TRUE
    WHERE m.adm_date_time BETWEEN w.window_start AND w.window_end
      AND (m.disch_date_time IS NULL OR m.disch_date_time >= w.window_start)
    GROUP BY m.patient_mrn
  )

-- Final SELECT
SELECT DISTINCT
  s.subject_id                               AS omics_id,
  o.sample_id,
  s.patient_mrn,
  d.age,
  CASE 
    WHEN d.age BETWEEN 18 AND 45 THEN '18-45'
    WHEN d.age BETWEEN 46 AND 59 THEN '46-59'
    WHEN d.age >= 60           THEN '60+'
    ELSE 'Other'
  END                                         AS age_group,
  d.gender,
  d.race,
  o.date_of_collection,
  o.genotype,
  o.percent_f_cells,

  -- ADVIA
  o.hb_advia,
  o.hct_advia,
  o.mcv_advia,
  o.mchc_advia,
  o.wbc_advia,
  o.neut_advia                             AS anc,
  o.plt_advia,
  o.retic_advia                            AS retic_percent,
  (o.retic_advia * o.rbc_advia / 100.0)::numeric(10,2) AS absolute_retic,
  o.drbc_advia                            AS dense_rbcs,

  -- Lorrca
  o.ei_min_lorrca,
  o.ei_max_lorrca,
  o.pos_lorrca,
  o.qc_pass_lorrca,
  o.instrument_lorrca,

  -- Viscosity
  o.visc_45,
  o.visc_225,
  o.hvr_45,
  o.hvr_225,

  -- Visits & VoE
  op.weight_kg,
  op.op_visit_date,
  voe.time_from_voe,

  -- HPLC before/after
  hbf.value_before                         AS hbf_before,
  hbf.date_before                          AS hbf_before_date,
  hbf.value_after                          AS hbf_after,
  hbf.date_after                           AS hbf_after_date,
  hba.value_before                         AS hba_before,
  hba.date_before                          AS hba_before_date,
  hba.value_after                          AS hba_after,
  hba.date_after                           AS hba_after_date,
  hba2.value_before                        AS hba2_before,
  hba2.date_before                         AS hba2_before_date,
  hba2.value_after                         AS hba2_after,
  hba2.date_after                          AS hba2_after_date,
  hbs.value_before                         AS hbs_before,
  hbs.date_before                          AS hbs_before_date,
  hbs.value_after                          AS hbs_after,
  hbs.date_after                           AS hbs_date_after,
  hbc.value_before                         AS hbc_before,
  hbc.date_before                          AS hbc_before_date,
  hbc.value_after                          AS hbc_after,
  hbc.date_after                           AS hbc_date_after,

  -- Latest other labs
  l.ldh,
  l.creatinine,
  l.urine_protein_cr,
  l.urine_albumin_cr AS albumin_creatinine_index,
  l.total_bili_serum,
  l.total_bili_labcorp,
  l.total_bili_quest,
  l.bili_labcorp,
  l.direct_bili,
  l.urine_bili,
  l.ferritin,
  l.vitamin_d,

  -- Medications
  ip_med.ip_hydroxyurea_status,
  ip_med.ip_voxelotor_status,
  ip_med.ip_glutamine_status,
  med.op_hydroxyurea_status,
  med.hydroxyurea_400mg,
  med.hydroxyurea_500mg,
  med.hydroxyurea_solution,
  med.op_voxelotor_status,
  med.oxbryta_500mg,
  med.voxelotor_500mg,
  med.op_glutamine_status,
  med.glutamine_5g,
  med.vit_d_supplement

FROM laboratory.omics_subjects s
JOIN filtered_omics      o        USING(subject_id)
JOIN clinical.demographics d        USING(patient_mrn)
LEFT JOIN nearest_op_visit op       ON s.patient_mrn = op.patient_mrn    AND o.date_of_collection = op.date_of_collection
LEFT JOIN nearest_voe      voe      ON s.patient_mrn = voe.patient_mrn   AND o.date_of_collection = voe.date_of_collection
LEFT JOIN hplc_before_after hbf     ON s.patient_mrn = hbf.patient_mrn   AND hbf.hplc_type = 'hbf'   AND o.date_of_collection = hbf.date_of_collection
LEFT JOIN hplc_before_after hba     ON s.patient_mrn = hba.patient_mrn   AND hba.hplc_type = 'hba'   AND o.date_of_collection = hba.date_of_collection
LEFT JOIN hplc_before_after hba2    ON s.patient_mrn = hba2.patient_mrn  AND hba2.hplc_type = 'hba2' AND o.date_of_collection = hba2.date_of_collection
LEFT JOIN hplc_before_after hbs     ON s.patient_mrn = hbs.patient_mrn   AND hbs.hplc_type = 'hbs'   AND o.date_of_collection = hbs.date_of_collection
LEFT JOIN hplc_before_after hbc     ON s.patient_mrn = hbc.patient_mrn   AND hbc.hplc_type = 'hbc'   AND o.date_of_collection = hbc.date_of_collection
LEFT JOIN latest_labs       l        ON s.patient_mrn = l.patient_mrn
LEFT JOIN medications       med      ON s.patient_mrn = med.patient_mrn
LEFT JOIN ip_medications    ip_med   ON s.patient_mrn = ip_med.patient_mrn
ORDER BY s.subject_id;

-- Display the first 100 rows of the created view
SELECT * FROM vw_omics_results LIMIT 100;

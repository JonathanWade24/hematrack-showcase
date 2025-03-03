CREATE OR REPLACE PROCEDURE get_omics_with_clinical(
  p_genotypes TEXT[],
  p_age_min INT,
  p_age_max INT,
  p_start_date DATE,
  p_end_date DATE,
  p_lab_components TEXT[],
  p_medications TEXT[],
  p_exclude_na_columns TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_text TEXT;
BEGIN
  -- Create a temporary table to store results
  DROP TABLE IF EXISTS temp_results;
  
  CREATE TEMP TABLE temp_results AS
  WITH filtered_omics AS (
    SELECT 
      o.subject_id,
      o.date_of_collection,
      o.genotype,
      o.hb_advia,
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
      o.visc_45,
      o.visc_225
    FROM laboratory.omics_results o
    WHERE 
      (p_genotypes IS NULL OR o.genotype = ANY(p_genotypes))
      AND o.date_of_collection BETWEEN p_start_date AND p_end_date
  ),
  relevant_labs AS (
    SELECT 
      l.patient_mrn,
      l.result_time as lab_date,
      l.lab_component_description,
      l.lab_result_value
    FROM clinical."Labs" l
    WHERE 
      (p_lab_components IS NULL OR l.lab_component_description = ANY(p_lab_components))
      AND l.result_time BETWEEN p_start_date AND p_end_date
  ),
  medications AS (
    SELECT DISTINCT
      m.patient_mrn,
      m.generic_description
    FROM clinical.op_medications m
    WHERE 
      (p_medications IS NULL OR m.generic_description = ANY(p_medications))
      AND m.visit_date BETWEEN p_start_date AND p_end_date
  )
  
  -- Main query
  SELECT 
    s.subject_id as omics_id,
    s.patient_mrn,
    o.date_of_collection,
    o.genotype,
    o.hb_advia,
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
    o.visc_45,
    o.visc_225,
    d.age,
    d.sex,
    d.race,
    d.ethnicity
  FROM laboratory.omics_subjects s
  JOIN filtered_omics o ON s.subject_id = o.subject_id
  JOIN clinical.demographics d ON s.patient_mrn = d.patient_mrn
  WHERE 
    (p_age_min IS NULL OR d.age >= p_age_min)
    AND (p_age_max IS NULL OR d.age <= p_age_max);
  
  -- Handle exclusion of NA values if specified
  IF p_exclude_na_columns IS NOT NULL AND array_length(p_exclude_na_columns, 1) > 0 THEN
    FOR i IN 1..array_length(p_exclude_na_columns, 1) LOOP
      EXECUTE format('DELETE FROM temp_results WHERE %I IS NULL OR %I = ''NA''', 
                    p_exclude_na_columns[i], p_exclude_na_columns[i]);
    END LOOP;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT * FROM temp_results;
END;
$$; 
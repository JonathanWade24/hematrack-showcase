-- ===============================================================
-- PREREQUISITES: CREATE ROLE MANAGEMENT TABLES AND FUNCTIONS
-- ===============================================================

-- Create role definitions table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Insert standard roles
INSERT INTO public.user_roles (name, description) VALUES
  ('admin', 'Full unrestricted access to all schemas and data'),
  ('clinical_researcher_full', 'Clinical researcher with full PHI access'),
  ('clinical_researcher_masked', 'Clinical researcher with masked PHI'),
  ('non_clinical_researcher', 'Laboratory data access only, no PHI'),
  ('clinical_data_entry', 'Patient registration and clinical data entry')
ON CONFLICT (name) DO NOTHING;

-- Create user-role mapping table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES public.user_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT r.name 
          FROM public.user_role_assignments a 
          JOIN public.user_roles r ON a.role_id = r.id 
          WHERE a.user_id = auth.uid()
          LIMIT 1);
END;
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT public.get_user_role() = required_role);
END;
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(variadic required_roles text[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT public.get_user_role() = ANY(required_roles));
END;
$$;

-- Function to sync user role to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  role_name TEXT;
BEGIN
  SELECT r.name INTO role_name
  FROM public.user_roles r
  WHERE r.id = NEW.role_id;
  
  -- Update user metadata with role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', role_name)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to sync role to metadata
DROP TRIGGER IF EXISTS sync_role_to_metadata ON public.user_role_assignments;
CREATE TRIGGER sync_role_to_metadata
AFTER INSERT OR UPDATE ON public.user_role_assignments
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_to_metadata();

-- Function to mask PHI data
CREATE OR REPLACE FUNCTION public.mask_phi(input text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN CASE
    WHEN input IS NULL THEN NULL
    WHEN LENGTH(input) <= 1 THEN input
    ELSE LEFT(input, 1) || REPEAT('*', LENGTH(input) - 1)
  END;
END;
$$;

-- ===============================================================
-- PHI SCHEMA RLS POLICIES
-- ===============================================================

-- Enable RLS on patients table
ALTER TABLE phi.patients ENABLE ROW LEVEL SECURITY;

-- Admin access to patients
CREATE POLICY "Admin full access to patients" ON phi.patients
FOR ALL
TO authenticated
USING (public.has_role('admin'));

-- Clinical researcher with full PHI access to patients
CREATE POLICY "Clinical researcher full access to patients" ON phi.patients
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

-- Clinical researcher with masked PHI - use masked view instead

-- Clinical data entry can manage patients
CREATE POLICY "Clinical data entry insert patients" ON phi.patients
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update patients" ON phi.patients
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select patients" ON phi.patients
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view of patients
CREATE OR REPLACE VIEW phi.masked_patients AS
SELECT 
  patient_mrn,
  public.mask_phi(first_name) AS first_name,
  public.mask_phi(last_name) AS last_name,
  public.mask_phi(middle_name) AS middle_name,
  EXTRACT(YEAR FROM birth_date)::text || '-**-**' AS birth_date,
  sex,
  race,
  ethnicity,
  public.mask_phi(patient_mrn) AS masked_patient_mrn,
  created_at,
  updated_at
FROM phi.patients;

-- Grant select on masked view to roles who need it
GRANT SELECT ON phi.masked_patients TO authenticated;

-- Enable RLS on subject_registration table
ALTER TABLE phi.subject_registration ENABLE ROW LEVEL SECURITY;

-- Admin full access to subject_registration
CREATE POLICY "Admin full access to subject_registration" ON phi.subject_registration
FOR ALL
TO authenticated
USING (public.has_role('admin'));

-- Clinical researcher view subject_registration
CREATE POLICY "Clinical researcher view subject_registration" ON phi.subject_registration
FOR SELECT
TO authenticated
USING (public.has_any_role('clinical_researcher_full', 'clinical_researcher_masked'));

-- Clinical data entry can manage subject_registration
CREATE POLICY "Clinical data entry manage subject_registration" ON phi.subject_registration
FOR ALL
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- ===============================================================
-- CLINICAL SCHEMA RLS POLICIES
-- ===============================================================

-- Note: Apply these to each table in the clinical schema
-- Replace "tablename" with the actual table names like "Labs", etc.

-- Enable RLS on all clinical tables
ALTER TABLE clinical."Labs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.bone_marrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.ip_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.ip_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.op_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.op_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.unified_visits ENABLE ROW LEVEL SECURITY;

-- Admin full access to clinical data
CREATE POLICY "Admin full access to Labs" ON clinical."Labs"
FOR ALL
TO authenticated
USING (public.has_role('admin'));

-- Clinical researcher with full PHI access
CREATE POLICY "Clinical researcher full access to Labs" ON clinical."Labs"
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

-- Clinical data entry can manage clinical data
CREATE POLICY "Clinical data entry insert Labs" ON clinical."Labs"
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update Labs" ON clinical."Labs"
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select Labs" ON clinical."Labs"
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked views for clinical researchers with masked PHI access
CREATE OR REPLACE VIEW clinical.masked_labs AS
SELECT 
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  public.mask_phi(pat_enc_csn_id) AS pat_enc_csn_id,
  order_time,
  proc_code,
  proc_name,
  component_id,
  lab_component_description,
  lab_result_value,
  result_time,
  created_at,
  updated_at
FROM clinical."Labs";

-- Grant select on masked views to authenticated users
GRANT SELECT ON clinical.masked_labs TO authenticated;

-- 2. Bone Marrow table policies
CREATE POLICY "Admin full access to bone_marrow" ON clinical.bone_marrow
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Clinical researcher full access to bone_marrow" ON clinical.bone_marrow
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

CREATE POLICY "Clinical data entry insert bone_marrow" ON clinical.bone_marrow
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update bone_marrow" ON clinical.bone_marrow
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select bone_marrow" ON clinical.bone_marrow
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view for bone_marrow
CREATE OR REPLACE VIEW clinical.masked_bone_marrow AS
SELECT
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  public.mask_phi(hsp_account_id) AS hsp_account_id,
  public.mask_phi(order_id) AS order_id,
  result_time,
  lab_code,
  lab_name,
  component_id,
  lab_component_description,
  bone_marrow_results_by_component,
  created_at,
  updated_at
FROM
  clinical.bone_marrow;

-- Grant select on masked view
GRANT SELECT ON clinical.masked_bone_marrow TO authenticated;

-- 3. Demographics table policies
CREATE POLICY "Admin full access to demographics" ON clinical.demographics
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Clinical researcher full access to demographics" ON clinical.demographics
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

CREATE POLICY "Clinical data entry insert demographics" ON clinical.demographics
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update demographics" ON clinical.demographics
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select demographics" ON clinical.demographics
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view for demographics
CREATE OR REPLACE VIEW clinical.masked_demographics AS
SELECT
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  -- Preserve non-PHI fields as-is
  gender,
  race,
  ethnicity,
  EXTRACT(YEAR FROM birth_date)::text || '-**-**' AS birth_date,
  created_at,
  updated_at
FROM
  clinical.demographics;

-- Grant select on masked view
GRANT SELECT ON clinical.masked_demographics TO authenticated;

-- 4. IP Admissions table policies
CREATE POLICY "Admin full access to ip_admissions" ON clinical.ip_admissions
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Clinical researcher full access to ip_admissions" ON clinical.ip_admissions
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

CREATE POLICY "Clinical data entry insert ip_admissions" ON clinical.ip_admissions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update ip_admissions" ON clinical.ip_admissions
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select ip_admissions" ON clinical.ip_admissions
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view for ip_admissions
CREATE OR REPLACE VIEW clinical.masked_ip_admissions AS
SELECT
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  public.mask_phi(hsp_account_id) AS hsp_account_id,
  adm_date_time,
  disch_date_time,
  discharge_department,
  discharge_disposition,
  created_at,
  updated_at
FROM
  clinical.ip_admissions;

-- Grant select on masked view
GRANT SELECT ON clinical.masked_ip_admissions TO authenticated;

-- 5. IP Medications table policies
CREATE POLICY "Admin full access to ip_medications" ON clinical.ip_medications
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Clinical researcher full access to ip_medications" ON clinical.ip_medications
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

CREATE POLICY "Clinical data entry insert ip_medications" ON clinical.ip_medications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update ip_medications" ON clinical.ip_medications
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select ip_medications" ON clinical.ip_medications
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view for ip_medications
CREATE OR REPLACE VIEW clinical.masked_ip_medications AS
SELECT
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  public.mask_phi(hsp_account_id) AS hsp_account_id,
  adm_date_time,
  disch_date_time,
  medication,
  dosage,
  unit,
  frequency,
  taken_time,
  rx_class_name,
  created_at,
  updated_at,
  has_date_issues,
  date_issue_notes
FROM
  clinical.ip_medications;

-- Grant select on masked view
GRANT SELECT ON clinical.masked_ip_medications TO authenticated;

-- 6. OP Medications table policies
CREATE POLICY "Admin full access to op_medications" ON clinical.op_medications
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Clinical researcher full access to op_medications" ON clinical.op_medications
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

CREATE POLICY "Clinical data entry insert op_medications" ON clinical.op_medications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update op_medications" ON clinical.op_medications
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select op_medications" ON clinical.op_medications
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view for op_medications
CREATE OR REPLACE VIEW clinical.masked_op_medications AS
SELECT
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  public.mask_phi(hsp_account_id) AS hsp_account_id,
  visit_date,
  order_med_id,
  order_dttm,
  rx_status,
  generic_description,
  created_at,
  updated_at
FROM
  clinical.op_medications;

-- Grant select on masked view
GRANT SELECT ON clinical.masked_op_medications TO authenticated;

-- 7. OP Visits table policies
CREATE POLICY "Admin full access to op_visits" ON clinical.op_visits
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Clinical researcher full access to op_visits" ON clinical.op_visits
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

CREATE POLICY "Clinical data entry insert op_visits" ON clinical.op_visits
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update op_visits" ON clinical.op_visits
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select op_visits" ON clinical.op_visits
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view for op_visits
CREATE OR REPLACE VIEW clinical.masked_op_visits AS
SELECT
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  public.mask_phi(pat_id) AS pat_id,
  public.mask_phi(hsp_account_id) AS hsp_account_id,
  visit_date,
  department_name,
  visit_type,
  created_at,
  updated_at
FROM
  clinical.op_visits;

-- Grant select on masked view
GRANT SELECT ON clinical.masked_op_visits TO authenticated;

-- 8. Unified Visits table policies
CREATE POLICY "Admin full access to unified_visits" ON clinical.unified_visits
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Clinical researcher full access to unified_visits" ON clinical.unified_visits
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

CREATE POLICY "Clinical data entry insert unified_visits" ON clinical.unified_visits
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry update unified_visits" ON clinical.unified_visits
FOR UPDATE
TO authenticated
USING (public.has_role('clinical_data_entry'))
WITH CHECK (public.has_role('clinical_data_entry'));

CREATE POLICY "Clinical data entry select unified_visits" ON clinical.unified_visits
FOR SELECT
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Create masked view for unified_visits
CREATE OR REPLACE VIEW clinical.masked_unified_visits AS
SELECT
  id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  public.mask_phi(visit_id) AS visit_id,
  start_date,
  end_date,
  visit_type,
  department,
  specific_visit_type,
  icu_admission_yn,
  discharge_disposition,
  admit_dx_cd,
  admit_dx_description,
  final_dx_cd,
  final_dx_description,
  bp_systolic,
  bp_diastolic,
  weight_kg,
  dx_codes,
  dx_names,
  heart_rate,
  respiratory_rate,
  temperature_f,
  spo2,
  created_at,
  updated_at
FROM
  clinical.unified_visits;

-- Grant select on masked view
GRANT SELECT ON clinical.masked_unified_visits TO authenticated;

-- ===============================================================
-- AUDIT SCHEMA RLS POLICIES
-- ===============================================================

-- Enable RLS on audit_log
ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;

-- Admin full access to audit logs
CREATE POLICY "Admin full access to audit_log" ON audit.audit_log
FOR ALL
TO authenticated
USING (public.has_role('admin'));

-- Other roles read-only access to audit logs
CREATE POLICY "Users view audit logs for their role" ON audit.audit_log
FOR SELECT
TO authenticated
USING (
  public.has_any_role('clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry')
  -- Add additional filtering if needed
);

-- ===============================================================
-- PUBLIC SCHEMA ROLE MANAGEMENT TABLES RLS POLICIES
-- ===============================================================

-- Admin manages role tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Admin full access to role tables
CREATE POLICY "Admin full access to user_roles" ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Admin full access to user_role_assignments" ON public.user_role_assignments
FOR ALL
TO authenticated
USING (public.has_role('admin'));

-- Users can view their own role
CREATE POLICY "Users view own role" ON public.user_role_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ===============================================================
-- SECURITY DEFINER FUNCTIONS FOR ADMIN OPERATIONS
-- ===============================================================

-- Function to assign role to user (admin only)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id UUID,
  role_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  role_id INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT (public.get_user_role() = 'admin') INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Get role ID
  SELECT id INTO role_id FROM public.user_roles WHERE name = role_name;
  
  IF role_id IS NULL THEN
    RAISE EXCEPTION 'Role % not found', role_name;
  END IF;
  
  -- Delete any existing role
  DELETE FROM public.user_role_assignments WHERE user_id = target_user_id;
  
  -- Insert new role
  INSERT INTO public.user_role_assignments (user_id, role_id)
  VALUES (target_user_id, role_id);
  
  RETURN TRUE;
END;
$$;

-- ===============================================================
-- ADDITIONAL HELPER VIEWS
-- ===============================================================

-- View for clinicians to see patients with all related data
CREATE OR REPLACE VIEW clinical.patient_summary AS
SELECT
  p.patient_mrn,
  p.first_name,
  p.last_name,
  p.middle_name,
  p.birth_date,
  p.sex,
  p.race,
  p.ethnicity,
  p.created_at,
  p.updated_at,
  s.subject_id,
  s.project
FROM
  phi.patients p
JOIN
  laboratory.omics_subjects s ON p.patient_mrn = s.patient_mrn;

-- Create the masked version
CREATE OR REPLACE VIEW clinical.masked_patient_summary AS
SELECT
  p.patient_mrn,
  public.mask_phi(p.first_name) AS first_name,
  public.mask_phi(p.last_name) AS last_name,
  public.mask_phi(p.middle_name) AS middle_name,
  EXTRACT(YEAR FROM p.birth_date)::text || '-**-**' AS birth_date,
  p.sex,
  p.race,
  p.ethnicity,
  public.mask_phi(p.patient_mrn) AS masked_patient_mrn,
  subject_id,
  project,
  p.created_at,
  p.updated_at
FROM
  clinical.patient_summary p;

-- Grant access to the views based on roles
GRANT SELECT ON clinical.patient_summary TO authenticated;
GRANT SELECT ON clinical.masked_patient_summary TO authenticated;

-- Create a function for checking access to patient summary
CREATE OR REPLACE FUNCTION public.can_access_patient_summary()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT public.has_any_role('admin', 'clinical_researcher_full', 'clinical_data_entry'));
END;
$$;

-- Create a function for checking access to masked patient summary
CREATE OR REPLACE FUNCTION public.can_access_masked_patient_summary()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT public.has_any_role('admin', 'clinical_researcher_masked'));
END;
$$;

-- ===============================================================
-- LABORATORY SCHEMA RLS POLICIES
-- ===============================================================

-- Enable RLS on laboratory tables
ALTER TABLE laboratory.omics_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory.omics_results ENABLE ROW LEVEL SECURITY;

-- Admin full access to omics_subjects
CREATE POLICY "Admin full access to omics_subjects" ON laboratory.omics_subjects
FOR ALL
TO authenticated
USING (public.has_role('admin'));

-- Clinical researchers can view omics_subjects
CREATE POLICY "Clinical researcher full view omics_subjects" ON laboratory.omics_subjects
FOR SELECT
TO authenticated
USING (public.has_role('clinical_researcher_full'));

-- Need masked view for clinical researcher masked
CREATE OR REPLACE VIEW laboratory.masked_omics_subjects AS
SELECT
  subject_id,
  public.mask_phi(patient_mrn) AS patient_mrn,
  project,
  created_at,
  updated_at
FROM laboratory.omics_subjects;

-- Grant select on masked view
GRANT SELECT ON laboratory.masked_omics_subjects TO authenticated;

-- Clinical data entry can manage omics_subjects during registration
CREATE POLICY "Clinical data entry manage omics_subjects" ON laboratory.omics_subjects
FOR ALL
TO authenticated
USING (public.has_role('clinical_data_entry'));

-- Non-clinical researchers need subject_id but not patient_mrn
CREATE POLICY "Non-clinical researcher view omics_subjects" ON laboratory.omics_subjects
FOR SELECT
TO authenticated
USING (public.has_role('non_clinical_researcher'));

-- Omics results policies
CREATE POLICY "Admin full access to omics_results" ON laboratory.omics_results
FOR ALL
TO authenticated
USING (public.has_role('admin'));

-- All researchers can view omics_results
CREATE POLICY "Researchers view omics_results" ON laboratory.omics_results
FOR SELECT
TO authenticated
USING (public.has_any_role('clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher'));

-- Non-clinical researchers can manage omics_results
CREATE POLICY "Non-clinical researcher insert omics_results" ON laboratory.omics_results
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('non_clinical_researcher'));

CREATE POLICY "Non-clinical researcher update omics_results" ON laboratory.omics_results
FOR UPDATE
TO authenticated
USING (public.has_role('non_clinical_researcher'))
WITH CHECK (public.has_role('non_clinical_researcher'));

CREATE POLICY "Non-clinical researcher delete omics_results" ON laboratory.omics_results
FOR DELETE
TO authenticated
USING (public.has_role('non_clinical_researcher'));

-- Clinical researchers can also manage results
CREATE POLICY "Clinical researcher insert omics_results" ON laboratory.omics_results
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role('clinical_researcher_full', 'clinical_researcher_masked'));

CREATE POLICY "Clinical researcher update omics_results" ON laboratory.omics_results
FOR UPDATE
TO authenticated
USING (public.has_any_role('clinical_researcher_full', 'clinical_researcher_masked'))
WITH CHECK (public.has_any_role('clinical_researcher_full', 'clinical_researcher_masked'));
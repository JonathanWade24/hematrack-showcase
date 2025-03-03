-- CreateTable
CREATE TABLE "clinical"."unified_visits" (
    "id" TEXT NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "visit_id" VARCHAR(50) NOT NULL,
    "visit_type" VARCHAR(2) NOT NULL,
    "source_id" VARCHAR(50) NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6),
    "department" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unified_visits_visit_id_key" ON "clinical"."unified_visits"("visit_id");

-- CreateIndex
CREATE INDEX "idx_unified_visits_mrn" ON "clinical"."unified_visits"("patient_mrn");

-- CreateIndex
CREATE INDEX "idx_unified_visits_dates" ON "clinical"."unified_visits"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_unified_visits_visit_id" ON "clinical"."unified_visits"("visit_id");

-- AddForeignKey
ALTER TABLE "clinical"."unified_visits" ADD CONSTRAINT "unified_visits_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Populate unified_visits from ip_admissions
INSERT INTO "clinical"."unified_visits" (
    id,
    patient_mrn,
    visit_id,
    visit_type,
    source_id,
    start_date,
    end_date,
    department
)
SELECT 
    gen_random_uuid()::text,
    patient_mrn,
    'IP-' || TO_CHAR(adm_date_time, 'YYYY') || LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM adm_date_time) ORDER BY adm_date_time) AS TEXT), 3, '0'),
    'IP',
    hsp_account_id,
    adm_date_time,
    disch_date_time,
    discharge_department
FROM "clinical"."ip_admissions";

-- Populate unified_visits from op_visits
INSERT INTO "clinical"."unified_visits" (
    id,
    patient_mrn,
    visit_id,
    visit_type,
    source_id,
    start_date,
    end_date,
    department
)
SELECT 
    gen_random_uuid()::text,
    patient_mrn,
    'OP-' || TO_CHAR(visit_date, 'YYYY') || LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM visit_date) ORDER BY visit_date) AS TEXT), 3, '0'),
    'OP',
    hsp_account_id,
    visit_date,
    visit_date,
    department_name
FROM "clinical"."op_visits";

-- Create view for associated labs
CREATE OR REPLACE VIEW "clinical"."visit_associated_labs" AS
SELECT 
    uv.id as visit_id,
    uv.visit_type,
    l.*
FROM 
    "clinical"."unified_visits" uv
    CROSS JOIN LATERAL (
        SELECT *
        FROM "clinical"."Labs" l
        WHERE l.patient_mrn = uv.patient_mrn
        AND (
            (uv.visit_type = 'IP' AND 
             l.result_time BETWEEN uv.start_date - INTERVAL '48 hours' 
             AND COALESCE(uv.end_date, uv.start_date + INTERVAL '48 hours'))
            OR 
            (uv.visit_type = 'OP' AND 
             l.result_time BETWEEN uv.start_date - INTERVAL '1 week' 
             AND uv.start_date + INTERVAL '1 week')
        )
    ) l;

-- Create view for associated medications
CREATE OR REPLACE VIEW "clinical"."visit_associated_medications" AS
SELECT 
    uv.id as visit_id,
    uv.visit_type,
    CASE 
        WHEN im.id IS NOT NULL THEN 
            jsonb_build_object(
                'id', im.id,
                'medication', im.medication,
                'dosage', im.dosage,
                'unit', im.unit,
                'frequency', im.frequency,
                'taken_time', im.taken_time,
                'source', 'ip'
            )
        ELSE 
            jsonb_build_object(
                'id', om.id,
                'medication', om.generic_description,
                'order_time', om.order_dttm,
                'status', om.rx_status,
                'source', 'op'
            )
    END as medication_data
FROM 
    "clinical"."unified_visits" uv
    LEFT JOIN "clinical"."ip_medications" im ON 
        im.patient_mrn = uv.patient_mrn AND
        uv.visit_type = 'IP' AND
        im.taken_time BETWEEN uv.start_date - INTERVAL '48 hours' 
        AND COALESCE(uv.end_date, uv.start_date + INTERVAL '48 hours')
    LEFT JOIN "clinical"."op_medications" om ON
        om.patient_mrn = uv.patient_mrn AND
        uv.visit_type = 'OP' AND
        om.visit_date BETWEEN uv.start_date - INTERVAL '1 week' 
        AND uv.start_date + INTERVAL '1 week'
WHERE im.id IS NOT NULL OR om.id IS NOT NULL;

-- CreateTable
CREATE TABLE "clinical"."Labs" (
    "id" SERIAL NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "pat_enc_csn_id" VARCHAR(50),
    "order_time" TIMESTAMP,
    "proc_code" VARCHAR(50),
    "proc_name" VARCHAR(200),
    "component_id" VARCHAR(50),
    "lab_component_description" VARCHAR(200),
    "lab_result_value" TEXT,
    "result_time" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Labs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Labs_result_time_idx" ON "clinical"."Labs"("result_time");

-- CreateIndex
CREATE INDEX "Labs_pat_enc_csn_id_idx" ON "clinical"."Labs"("pat_enc_csn_id");

-- CreateIndex
CREATE INDEX "Labs_patient_mrn_idx" ON "clinical"."Labs"("patient_mrn");

-- CreateIndex
CREATE INDEX "Labs_component_id_idx" ON "clinical"."Labs"("component_id");

-- AddForeignKey
ALTER TABLE "clinical"."Labs" ADD CONSTRAINT "Labs_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE RESTRICT ON UPDATE CASCADE;

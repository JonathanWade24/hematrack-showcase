-- CreateTable
CREATE TABLE "phi"."subject_registration" (
    "id" SERIAL NOT NULL,
    "subject_id" VARCHAR(50) NOT NULL,
    "registration_date" DATE NOT NULL,
    "consent_date" DATE NOT NULL,
    "corporate_id" VARCHAR(50),
    "patient_mrn" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_registration_subject_id_key" ON "phi"."subject_registration"("subject_id");

-- CreateIndex
CREATE INDEX "idx_subject_registration_mrn" ON "phi"."subject_registration"("patient_mrn");

-- AddForeignKey
ALTER TABLE "phi"."subject_registration" ADD CONSTRAINT "subject_registration_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "phi"."subject_registration" ADD CONSTRAINT "subject_registration_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "laboratory"."omics_subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

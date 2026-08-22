ALTER TABLE animals
ADD CONSTRAINT chk_animal_birth_date
CHECK (
    birth_date IS NULL
    OR birth_date <= CURRENT_DATE
);

ALTER TABLE medical_records
ADD CONSTRAINT chk_medical_date
CHECK (
    medical_date <= CURRENT_DATE
);

ALTER TABLE preventive_care_records
ADD CONSTRAINT chk_preventive_date_given
CHECK (
    date_given <= CURRENT_DATE
);

ALTER TABLE observations
ADD CONSTRAINT chk_observation_resolved_date
CHECK (
    resolved_at IS NULL
    OR resolved_at >= created_at
);
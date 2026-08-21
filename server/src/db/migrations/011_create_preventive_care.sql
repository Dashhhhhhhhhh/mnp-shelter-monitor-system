CREATE TABLE preventive_care_records (
    preventive_care_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    animal_id UUID NOT NULL,
    medical_record_id UUID,

    care_type VARCHAR(20) NOT NULL,
    date_given DATE NOT NULL,

    product_name VARCHAR(150),
    dose VARCHAR(100),
    next_due_date DATE,

    clinic VARCHAR(150),
    vet_name VARCHAR(100),
    notes TEXT,

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_preventive_care_type
        CHECK (
            care_type IN (
                'VACCINATION',
                'DEWORMING'
            )
        ),

    CONSTRAINT chk_preventive_care_dates
        CHECK (
            next_due_date IS NULL
            OR next_due_date >= date_given
        ),

    CONSTRAINT fk_preventive_care_animal
        FOREIGN KEY (animal_id)
        REFERENCES animals(animal_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_preventive_care_medical_record
        FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(medical_record_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_preventive_care_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_preventive_care_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
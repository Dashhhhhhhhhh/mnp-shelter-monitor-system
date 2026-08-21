CREATE TABLE medications (
    medication_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    medical_record_id UUID,
    animal_id UUID NOT NULL,

    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),

    start_date DATE NOT NULL,
    end_date DATE,

    instructions TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_medication_status
        CHECK (
            status IN (
                'ACTIVE',
                'COMPLETED',
                'DISCONTINUED'
            )
        ),

    CONSTRAINT chk_medication_dates
        CHECK (
            end_date IS NULL
            OR end_date >= start_date
        ),

    CONSTRAINT fk_medications_medical_record
        FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(medical_record_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_medications_animal
        FOREIGN KEY (animal_id)
        REFERENCES animals(animal_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_medications_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_medications_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
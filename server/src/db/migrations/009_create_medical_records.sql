CREATE TABLE medical_records (
    medical_record_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    animal_id UUID NOT NULL,
    observation_id UUID,

    medical_type VARCHAR(20) NOT NULL,

    medical_date DATE NOT NULL,
    reason TEXT NOT NULL,

    clinic VARCHAR(150),
    vet_name VARCHAR(100),

    diagnosis TEXT,
    treatment TEXT,
    follow_up_date DATE,
    notes TEXT,

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_medical_type
        CHECK (
            medical_type IN (
                'VET_VISIT',
                'TREATMENT',
                'FOLLOW_UP',
                'OTHER'
            )
        ),

    CONSTRAINT chk_medical_follow_up_date
        CHECK (
            follow_up_date IS NULL
            OR follow_up_date >= medical_date
        ),

    CONSTRAINT fk_medical_records_animal
        FOREIGN KEY (animal_id)
        REFERENCES animals(animal_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_medical_records_observation
        FOREIGN KEY (observation_id)
        REFERENCES observations(observation_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_medical_records_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_medical_records_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
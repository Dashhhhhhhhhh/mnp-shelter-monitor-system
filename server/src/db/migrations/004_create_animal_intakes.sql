CREATE TABLE animal_intakes (
    intake_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    animal_id UUID NOT NULL,

    intake_date DATE NOT NULL,
    intake_category VARCHAR(25) NOT NULL,
    intake_source VARCHAR(25) NOT NULL,

    found_location VARCHAR(255),
    age_at_intake VARCHAR(50),
    observed_condition TEXT,

    rescued_by_user_id UUID,
    outside_rescuer_name VARCHAR(100),
    outside_rescuer_contact VARCHAR(100),

    notes TEXT,

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_animal_intakes_animal
        FOREIGN KEY (animal_id)
        REFERENCES animals(animal_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_animal_intakes_rescued_by
        FOREIGN KEY (rescued_by_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_animal_intakes_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_animal_intakes_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_intake_date
        CHECK (intake_date <= CURRENT_DATE),

    CONSTRAINT chk_intake_category
        CHECK (
            intake_category IN (
                'RESCUE',
                'SURRENDERED',
                'ABANDONED_DUMPED',
                'ADOPTION_RETURN',
                'TRANSFER',
                'OTHER'
            )
        ),

    CONSTRAINT chk_intake_source
        CHECK (
            intake_source IN (
                'MNP_VOLUNTEER',
                'OUTSIDE_PERSON',
                'FOUND_BY_MNP',
                'UNKNOWN',
                'OTHER'
            )
        )
);
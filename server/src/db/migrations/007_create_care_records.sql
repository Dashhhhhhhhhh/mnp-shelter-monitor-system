CREATE TABLE care_records (
    care_record_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

    cage_id UUID NOT NULL,

    care_date DATE NOT NULL,
    care_period VARCHAR(10) NOT NULL,
    care_type VARCHAR(20) NOT NULL,
    cleaning_type VARCHAR(20),

    status VARCHAR(15) NOT NULL DEFAULT 'PENDING',

    completed_by UUID,
    completed_at TIMESTAMPTZ,
    notes TEXT,

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_care_period
        CHECK (care_period IN ('AM', 'PM', 'EXTRA')),

    CONSTRAINT chk_care_type
        CHECK (
            care_type IN (
                'FEEDING',
                'CLEANING',
                'RELIEF_BREAK'
            )
        ),

    CONSTRAINT chk_care_status
        CHECK (status IN ('PENDING', 'COMPLETED')),

    CONSTRAINT chk_cleaning_type
        CHECK (
            (
                care_type = 'CLEANING'
                AND cleaning_type IN ('LITTER_BOX', 'FULL_CAGE')
            )
            OR
            (
                care_type <> 'CLEANING'
                AND cleaning_type IS NULL
            )
        ),

    CONSTRAINT chk_care_completion
        CHECK (
            (status = 'PENDING' AND completed_at IS NULL)
            OR
            (status = 'COMPLETED' AND completed_at IS NOT NULL)
        ),

    CONSTRAINT fk_care_records_cage
        FOREIGN KEY (cage_id)
        REFERENCES cages(cage_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_care_records_completed_by
        FOREIGN KEY (completed_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_care_records_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_care_records_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_care_records_scheduled_task
ON care_records (
    cage_id,
    care_date,
    care_period,
    care_type,
    COALESCE(cleaning_type, '')
)
WHERE care_period IN ('AM', 'PM');
CREATE TABLE observations (
    observation_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

    cage_id UUID NOT NULL,
    animal_id UUID,

    observation_type VARCHAR(30) NOT NULL,
    urgency VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',

    notes TEXT,
    photo TEXT,

    created_by UUID,
    handled_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMPTZ,

    CONSTRAINT chk_observation_type
        CHECK (
            observation_type IN (
                'NOT_EATING',
                'VOMITING',
                'DIARRHEA',
                'INJURY',
                'LIMPING',
                'FIGHTING',
                'EYE_NOSE_DISCHARGE',
                'UNUSUAL_BEHAVIOR',
                'CAGE_CONCERN',
                'OTHER'
            )
        ),

    CONSTRAINT chk_observation_urgency
        CHECK (
            urgency IN (
                'NORMAL',
                'NEEDS_ATTENTION',
                'URGENT'
            )
        ),

    CONSTRAINT chk_observation_status
        CHECK (
            status IN (
                'NEW',
                'BEING_HANDLED',
                'MONITORING',
                'RESOLVED',
                'ESCALATED_TO_MEDICAL'
            )
        ),

    CONSTRAINT fk_observations_cage
        FOREIGN KEY (cage_id)
        REFERENCES cages(cage_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_observations_animal
        FOREIGN KEY (animal_id)
        REFERENCES animals(animal_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_observations_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_observations_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_observations_handled_by
        FOREIGN KEY (handled_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_observation_resolution
        CHECK (
            (status = 'RESOLVED' AND resolved_at IS NOT NULL)
            OR
            (status <> 'RESOLVED' AND resolved_at IS NULL)
        )
);
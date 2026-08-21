CREATE TABLE cages (
    cage_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cage_code VARCHAR(20) NOT NULL UNIQUE,

    species_group VARCHAR(10) NOT NULL,
    gender_group VARCHAR(10) NOT NULL,

    recommended_capacity INTEGER NOT NULL,

    cage_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    location VARCHAR(100) NULL,

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,


    CHECK (species_group IN ('CAT', 'DOG', 'MIXED')), 

    CHECK (gender_group IN ('MALE', 'FEMALE', 'MIXED')),

    CHECK (recommended_capacity > 0),

    CHECK (cage_type IN ('NORMAL', 'ISOLATION', 'TEMPORARY')),

    CHECK (status IN ('ACTIVE', 'INACTIVE', 'PLANNED')),

    CONSTRAINT fk_cages_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_cages_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
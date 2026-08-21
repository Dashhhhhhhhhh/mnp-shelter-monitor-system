CREATE TABLE animals (
    animal_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

    animal_code VARCHAR(30) NOT NULL UNIQUE,
    animal_name VARCHAR(50),

    species VARCHAR(10) NOT NULL,
    breed VARCHAR(100),
    life_stage VARCHAR(20) NOT NULL,
    sex VARCHAR(10) NOT NULL,
    collar_color VARCHAR(20),

    birth_date DATE,
    birth_date_is_estimated BOOLEAN NOT NULL DEFAULT FALSE,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    health_status VARCHAR(25) NOT NULL DEFAULT 'UNKNOWN',
    adoption_status VARCHAR(20) NOT NULL DEFAULT 'NOT_READY',

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT chk_species
        CHECK (species IN ('CAT', 'DOG')),

    CONSTRAINT chk_life_stage
        CHECK (
            life_stage IN (
                'BABY',
                'JUVENILE',
                'ADULT',
                'SENIOR',
                'UNKNOWN'
            )
        ),

    CONSTRAINT chk_sex
        CHECK (sex IN ('MALE', 'FEMALE')),

    CONSTRAINT chk_animal_status
        CHECK (
            status IN (
                'ACTIVE',
                'ADOPTED',
                'PASSED_AWAY',
                'MISSING',
                'ESCAPED'
            )
        ),

    CONSTRAINT chk_health_status
        CHECK (
            health_status IN (
                'HEALTHY',
                'SICK',
                'INJURED',
                'UNDER_OBSERVATION',
                'UNKNOWN'
            )
        ),

    CONSTRAINT chk_adoption_status
        CHECK (
            adoption_status IN (
                'NOT_READY',
                'AVAILABLE',
                'RESERVED',
                'ADOPTED',
                'RETURNED'
            )
        ),

    CONSTRAINT chk_estimated_birth_date
        CHECK (
            birth_date IS NOT NULL
            OR birth_date_is_estimated = FALSE
        ),

    CONSTRAINT fk_animals_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_animals_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
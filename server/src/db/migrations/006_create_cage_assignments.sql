CREATE TABLE cage_assignments (
    assignment_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

    animal_id UUID NOT NULL,
    cage_id UUID NOT NULL,

    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by UUID,

    removed_at TIMESTAMPTZ,
    removed_by UUID,

    reason TEXT,

    CONSTRAINT fk_animal
        FOREIGN KEY (animal_id)
        REFERENCES animals(animal_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cage
        FOREIGN KEY (cage_id)
        REFERENCES cages(cage_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_removed_by
        FOREIGN KEY (removed_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_assignment_dates
        CHECK (
            removed_at IS NULL
            OR removed_at >= assigned_at
        )
);

CREATE UNIQUE INDEX uq_cage_assignments_active_animal
ON cage_assignments(animal_id)
WHERE removed_at IS NULL;
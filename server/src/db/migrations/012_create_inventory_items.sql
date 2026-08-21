CREATE TABLE inventory_items (
    inventory_item_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    item_name VARCHAR(150) NOT NULL,
    variant VARCHAR(150),

    item_type VARCHAR(20) NOT NULL,
    category VARCHAR(30) NOT NULL,

    package_size NUMERIC(10,2),
    package_size_unit VARCHAR(10),

    unit VARCHAR(30),

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_inventory_item_type
        CHECK (
            item_type IN (
                'FOOD',
                'SUPPLY'
            )
        ),

    CONSTRAINT chk_inventory_category
        CHECK (
            category IN (
                'CAT_FOOD',
                'DOG_FOOD',
                'CAT_LITTER',
                'CLEANING_SUPPLY',
                'MEDICAL_SUPPLY',
                'CAGE_SUPPLY',
                'OTHER'
            )
        ),

    CONSTRAINT chk_inventory_package_size
        CHECK (
            package_size IS NULL
            OR package_size > 0
        ),

    CONSTRAINT chk_inventory_package_size_unit
        CHECK (
            (
                package_size IS NULL
                AND package_size_unit IS NULL
            )
            OR
            (
                package_size IS NOT NULL
                AND package_size_unit IS NOT NULL
            )
        ),

    CONSTRAINT fk_inventory_items_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_inventory_items_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
CREATE TABLE inventory_stock_records (
    stock_record_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    inventory_item_id UUID NOT NULL,

    record_type VARCHAR(20) NOT NULL,

    quantity NUMERIC(10,2),
    adjustment_direction VARCHAR(10),

    estimated_level VARCHAR(20),
    stock_status VARCHAR(10),

    notes TEXT,

    recorded_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_stock_record_type
        CHECK (
            record_type IN (
                'RECEIVED',
                'USED',
                'ADJUSTMENT',
                'STOCK_CHECK'
            )
        ),

    CONSTRAINT chk_stock_quantity
        CHECK (
            quantity IS NULL
            OR quantity >= 0
        ),

    CONSTRAINT chk_adjustment_direction
        CHECK (
            (
                record_type = 'ADJUSTMENT'
                AND adjustment_direction IN ('ADD', 'REMOVE')
            )
            OR
            (
                record_type <> 'ADJUSTMENT'
                AND adjustment_direction IS NULL
            )
        ),

    CONSTRAINT chk_estimated_level
        CHECK (
            estimated_level IS NULL
            OR estimated_level IN (
                'FULL',
                'THREE_QUARTERS',
                'HALF',
                'ONE_QUARTER',
                'ALMOST_EMPTY',
                'EMPTY'
            )
        ),

    CONSTRAINT chk_stock_status
        CHECK (
            stock_status IS NULL
            OR stock_status IN (
                'GOOD',
                'LOW',
                'OUT'
            )
        ),

    CONSTRAINT fk_inventory_stock_item
        FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(inventory_item_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inventory_stock_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
CREATE TABLE donation_items (
    donation_item_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    donation_id UUID NOT NULL,
    inventory_item_id UUID,

    item_name VARCHAR(150) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(30) NOT NULL,

    notes TEXT,

    CONSTRAINT fk_donation_items_donation
        FOREIGN KEY (donation_id)
        REFERENCES donations(donation_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_donation_items_inventory_item
        FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(inventory_item_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_donation_item_quantity
        CHECK (quantity > 0)
);
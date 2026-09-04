BEGIN;

ALTER TABLE inventory_stock_records
ADD COLUMN donation_item_id UUID NULL;

ALTER TABLE inventory_stock_records
ADD CONSTRAINT fk_inventory_stock_records_donation_item
FOREIGN KEY (donation_item_id)
REFERENCES donation_items(donation_item_id)
ON DELETE RESTRICT;

ALTER TABLE inventory_stock_records
ADD CONSTRAINT chk_inventory_stock_record_donation_item
CHECK (
  donation_item_id IS NULL
  OR record_type = 'RECEIVED'
);

CREATE INDEX idx_inventory_stock_records_donation_item_id
ON inventory_stock_records(donation_item_id)
WHERE donation_item_id IS NOT NULL;

COMMIT;
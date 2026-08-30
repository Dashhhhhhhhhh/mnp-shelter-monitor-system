ALTER TABLE inventory_stock_records
ADD COLUMN idempotency_key UUID,
ADD COLUMN idempotency_request_hash VARCHAR(64);

ALTER TABLE inventory_stock_records
ADD CONSTRAINT uq_inventory_stock_recorded_by_idempotency_key
UNIQUE (recorded_by, idempotency_key);
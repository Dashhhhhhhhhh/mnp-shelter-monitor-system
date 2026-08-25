ALTER TABLE cages
ADD COLUMN idempotency_key UUID,
ADD COLUMN idempotency_request_hash VARCHAR(64);

ALTER TABLE cages
ADD CONSTRAINT uq_cages_created_by_idempotency_key
UNIQUE (created_by, idempotency_key);
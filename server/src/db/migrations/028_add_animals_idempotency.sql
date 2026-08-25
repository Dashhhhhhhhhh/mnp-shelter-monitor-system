ALTER TABLE animals
ADD COLUMN idempotency_key UUID,
ADD COLUMN idempotency_request_hash VARCHAR(64);

ALTER TABLE animals
ADD CONSTRAINT uq_animals_created_by_idempotency_key
UNIQUE (created_by, idempotency_key);
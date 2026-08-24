ALTER TABLE animal_intakes
ADD COLUMN idempotency_request_hash VARCHAR(64) NULL;
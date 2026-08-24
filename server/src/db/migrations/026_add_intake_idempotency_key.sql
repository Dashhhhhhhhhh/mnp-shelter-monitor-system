ALTER TABLE animal_intakes
ADD COLUMN idempotency_key UUID NULL;

ALTER TABLE animal_intakes
ADD CONSTRAINT uq_animal_intakes_created_by_idempotency_key
UNIQUE (created_by, idempotency_key);
BEGIN;

ALTER TABLE animals
DROP CONSTRAINT chk_life_stage;

ALTER TABLE animals
ADD CONSTRAINT chk_life_stage
CHECK (
  life_stage IN (
    'KITTEN',
    'PUPPY',
    'ADULT',
    'OTHER'
  )
);

COMMIT;
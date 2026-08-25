ALTER TABLE cages
DROP CONSTRAINT cages_species_group_check;

ALTER TABLE cages
ADD CONSTRAINT cages_species_group_check
CHECK (species_group IN ('CAT', 'DOG'));

DROP SEQUENCE IF EXISTS cage_mixed_code_seq;
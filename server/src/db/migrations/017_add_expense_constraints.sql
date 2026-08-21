ALTER TABLE expenses
    ADD CONSTRAINT chk_expense_category
        CHECK (
            category IN (
                'VET',
                'MEDICINE',
                'FOOD',
                'LITTER',
                'CAGE_SUPPLIES',
                'CLEANING_SUPPLIES',
                'TRANSPORTATION',
                'OTHER'
            )
        ),

    ADD CONSTRAINT fk_expenses_animal
        FOREIGN KEY (animal_id)
        REFERENCES animals(animal_id)
        ON DELETE SET NULL,

    ADD CONSTRAINT fk_expenses_medical_record
        FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(medical_record_id)
        ON DELETE SET NULL,

    ADD CONSTRAINT fk_expenses_paid_by
        FOREIGN KEY (paid_by_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    ADD CONSTRAINT fk_expenses_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    ADD CONSTRAINT fk_expenses_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL;
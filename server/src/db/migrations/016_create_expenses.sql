CREATE TABLE expenses (
    expense_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    expense_date DATE NOT NULL,

    category VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,

    animal_id UUID,
    medical_record_id UUID,

    paid_by_user_id UUID,

    payment_source VARCHAR(30) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,

    receipt TEXT,
    notes TEXT,

    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_expense_amount
        CHECK (amount > 0),

    CONSTRAINT chk_expense_date
        CHECK (expense_date <= CURRENT_DATE),

    CONSTRAINT chk_expense_payment_source
        CHECK (
            payment_source IN (
                'MNP_SHELTER_FUND',
                'PERSONAL_CONTRIBUTION',
                'PERSONAL_ADVANCE',
                'DIRECT_SPONSOR_PAYMENT'
            )
        ),

    CONSTRAINT chk_expense_payment_method
        CHECK (
            payment_method IN (
                'CASH',
                'GCASH',
                'BANK_TRANSFER',
                'OTHER'
            )
        )
);

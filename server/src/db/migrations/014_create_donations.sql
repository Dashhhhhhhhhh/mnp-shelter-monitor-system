CREATE TABLE donations (
    donation_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    donation_type VARCHAR(20) NOT NULL,
    donation_date DATE NOT NULL,

    monetary_amount NUMERIC(12,2),

    payment_method VARCHAR(20),
    payment_provider VARCHAR(100),

    donor_name VARCHAR(150),
    donor_contact VARCHAR(100),

    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,

    purpose TEXT,
    notes TEXT,

    received_by UUID,
    created_by UUID,
    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_donation_type
        CHECK (
            donation_type IN (
                'MONETARY',
                'IN_KIND',
                'DIRECT_PAYMENT'
            )
        ),

    CONSTRAINT chk_donation_payment_method
        CHECK (
            payment_method IS NULL
            OR payment_method IN (
                'CASH',
                'E_WALLET',
                'BANK_TRANSFER',
                'OTHER'
            )
        ),

    CONSTRAINT chk_donation_amount
        CHECK (
            (
                donation_type IN ('MONETARY', 'DIRECT_PAYMENT')
                AND monetary_amount IS NOT NULL
                AND monetary_amount > 0
            )
            OR
            (
                donation_type = 'IN_KIND'
                AND (
                    monetary_amount IS NULL
                    OR monetary_amount > 0
                )
            )
        ),

    CONSTRAINT chk_donation_date
        CHECK (donation_date <= CURRENT_DATE),

    CONSTRAINT fk_donations_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_donations_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_donations_received_by
        FOREIGN KEY (received_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
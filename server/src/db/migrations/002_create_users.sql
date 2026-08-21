CREATE TABLE users (

    user_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

    role_id INTEGER NOT NULL,

    first_name VARCHAR(50) NOT NULL,

    middle_initial VARCHAR(5),

    last_name VARCHAR(50) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    contact_number VARCHAR(20),

    is_active BOOLEAN DEFAULT true NOT NULL,

    created_by UUID,

    updated_by UUID,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_email_format
        CHECK (email LIKE '%@%.%'),

    CONSTRAINT fk_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL

);
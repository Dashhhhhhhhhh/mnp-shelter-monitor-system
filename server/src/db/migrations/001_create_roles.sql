CREATE TABLE roles (
    role_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(20) NOT NULL UNIQUE,
    CHECK (role_name ~ '^[A-Z]+$')
);

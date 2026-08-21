CREATE TABLE activity_logs (
    activity_log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    user_id UUID,

    action_type VARCHAR(50) NOT NULL,

    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,

    description TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

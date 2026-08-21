CREATE TABLE notifications (
    notification_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    notification_type VARCHAR(50) NOT NULL,

    entity_type VARCHAR(50),
    entity_id UUID,

    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
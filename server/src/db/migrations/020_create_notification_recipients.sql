CREATE TABLE notification_recipients (
    notification_recipient_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    notification_id UUID NOT NULL,
    user_id UUID NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    CONSTRAINT fk_notification_recipients_notification
        FOREIGN KEY (notification_id)
        REFERENCES notifications(notification_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_recipients_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_notification_recipient
        UNIQUE (notification_id, user_id),

    CONSTRAINT chk_notification_read_status
        CHECK (s
            (is_read = FALSE AND read_at IS NULL)
            OR
            (is_read = TRUE AND read_at IS NOT NULL)
        )
);
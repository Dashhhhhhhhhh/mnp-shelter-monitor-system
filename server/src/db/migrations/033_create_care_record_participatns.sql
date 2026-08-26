CREATE TABLE care_record_participants (
  care_record_participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  care_record_id UUID NOT NULL,
  user_id UUID NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_care_record_participants_record
    FOREIGN KEY (care_record_id)
    REFERENCES care_records(care_record_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_care_record_participants_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_care_record_participant
    UNIQUE (care_record_id, user_id)
);
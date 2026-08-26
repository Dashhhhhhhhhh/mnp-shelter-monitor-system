ALTER TABLE observations
ADD CONSTRAINT chk_observation_handled_by
CHECK (
  (
    status = 'NEW'
    AND handled_by IS NULL
  )
  OR
  (
    status IN (
      'BEING_HANDLED',
      'MONITORING',
      'RESOLVED',
      'ESCALATED_TO_MEDICAL'
    )
    AND handled_by IS NOT NULL
  )
);
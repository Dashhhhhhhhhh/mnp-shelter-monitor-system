ALTER TABLE care_records
ADD CONSTRAINT chk_care_completed_by
CHECK (
  (
    status = 'PENDING'
    AND completed_by IS NULL
  )
  OR
  (
    status = 'COMPLETED'
    AND completed_by IS NOT NULL
  )
);
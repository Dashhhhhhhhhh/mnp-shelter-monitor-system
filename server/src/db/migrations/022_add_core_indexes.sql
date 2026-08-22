CREATE INDEX idx_animal_intakes_animal
ON animal_intakes(animal_id);

CREATE INDEX idx_cage_assignments_current_cage
ON cage_assignments(cage_id)
WHERE removed_at IS NULL;

CREATE INDEX idx_observations_animal
ON observations(animal_id);

CREATE INDEX idx_observations_status
ON observations(status);

CREATE INDEX idx_medical_records_animal_date
ON medical_records(animal_id, medical_date DESC);

CREATE INDEX idx_medications_animal_status
ON medications(animal_id, status);

CREATE INDEX idx_inventory_stock_item_date
ON inventory_stock_records(inventory_item_id, created_at DESC);

CREATE INDEX idx_activity_logs_entity
ON activity_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX idx_notification_recipients_user_unread
ON notification_recipients(user_id, is_read);
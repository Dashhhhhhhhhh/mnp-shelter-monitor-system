import pool from "../../config/db.js";

async function insertAnimalIntake({
  animalId,
  intakeDate,
  intakeCategory,
  intakeSource,
  foundLocation,
  ageAtIntake,
  observedCondition,
  rescuedByUserId,
  outsideRescuerName,
  outsideRescuerContact,
  notes,
  createdBy,
  idempotencyKey,
  idempotencyRequestHash,
}) {
  const result = await pool.query(
    `INSERT INTO animal_intakes (
      idempotency_key,
      idempotency_request_hash,
      animal_id,
      intake_date,
      intake_category,
      intake_source,
      found_location,
      age_at_intake,
      observed_condition,
      rescued_by_user_id,
      outside_rescuer_name,
      outside_rescuer_contact,
      notes,
      created_by,
      updated_by
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14, $14
    )
    RETURNING
      intake_id,
      animal_id,
      intake_date::text AS intake_date,
      intake_category,
      intake_source,
      found_location,
      age_at_intake,
      observed_condition,
      rescued_by_user_id,
      outside_rescuer_name,
      outside_rescuer_contact,
      notes,
      created_by,
      updated_by,
      created_at,
      updated_at`,
    [
      idempotencyKey,
      idempotencyRequestHash,
      animalId,
      intakeDate,
      intakeCategory,
      intakeSource,
      foundLocation,
      ageAtIntake,
      observedCondition,
      rescuedByUserId,
      outsideRescuerName,
      outsideRescuerContact,
      notes,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findIntakesByAnimalId(animalId) {
  const result = await pool.query(
    `SELECT
        intake_id,
        animal_id,
        intake_date::text AS intake_date,
        intake_category,
        intake_source,
        found_location,
        age_at_intake,
        observed_condition,
        rescued_by_user_id,
        outside_rescuer_name,
        outside_rescuer_contact,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
        FROM animal_intakes
        WHERE animal_id = $1
        ORDER BY intake_date DESC, created_at DESC;`,
    [animalId],
  );
  return result.rows;
}

async function findIntakeById(intakeId) {
  const result = await pool.query(
    `
    SELECT   
        intake_id,
        animal_id,
        intake_date::text AS intake_date,
        intake_category,
        intake_source,
        found_location,
        age_at_intake,
        observed_condition,
        rescued_by_user_id,
        outside_rescuer_name,
        outside_rescuer_contact,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
    FROM animal_intakes
    WHERE intake_id = $1`,
    [intakeId],
  );
  return result.rows[0];
}

async function updateIntakeRecord(intakeId, updates, updatedBy) {
  const columnMap = {
    intakeDate: "intake_date",
    intakeCategory: "intake_category",
    intakeSource: "intake_source",
    foundLocation: "found_location",
    ageAtIntake: "age_at_intake",
    observedCondition: "observed_condition",
    rescuedByUserId: "rescued_by_user_id",
    outsideRescuerName: "outside_rescuer_name",
    outsideRescuerContact: "outside_rescuer_contact",
    notes: "notes",
  };

  const setClauses = [];
  const values = [];

  for (const [field, value] of Object.entries(updates)) {
    const column = columnMap[field];

    if (!column) continue;

    values.push(value);

    setClauses.push(`${column} = $${values.length}`);
  }

  values.push(updatedBy);
  const updatedByPosition = values.length;

  values.push(intakeId);
  const intakeIdPosition = values.length;

  const result = await pool.query(
    `UPDATE animal_intakes
    SET
      ${setClauses.join(", ")},
      updated_by = $${updatedByPosition},
      updated_at = NOW()
    WHERE intake_id = $${intakeIdPosition}
    RETURNING
      intake_id,
      animal_id,
      intake_date::text AS intake_date,
      intake_category,
      intake_source,
      found_location,
      age_at_intake,
      observed_condition,
      rescued_by_user_id,
      outside_rescuer_name,
      outside_rescuer_contact,
      notes,
      created_by,
      updated_by,
      created_at,
      updated_at`,
    values,
  );

  return result.rows[0];
}

async function findIntakeByIdempotencyKey(createdBy, idempotencyKey) {
  const result = await pool.query(
    `SELECT
      intake_id,
      animal_id,
      intake_date::text AS intake_date,
      intake_category,
      intake_source,
      found_location,
      age_at_intake,
      observed_condition,
      rescued_by_user_id,
      outside_rescuer_name,
      outside_rescuer_contact,
      notes,
      created_by,
      updated_by,
      created_at,
      updated_at,
      idempotency_request_hash
    FROM animal_intakes
    WHERE created_by = $1
      AND idempotency_key = $2`,
    [createdBy, idempotencyKey],
  );

  return result.rows[0];
}

export {
  insertAnimalIntake,
  findIntakesByAnimalId,
  findIntakeById,
  updateIntakeRecord,
  findIntakeByIdempotencyKey
};

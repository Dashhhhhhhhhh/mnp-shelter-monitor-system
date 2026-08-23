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
}) {
  const result = await pool.query(
    `INSERT INTO animal_intakes (
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
      $8, $9, $10, $11, $12, $12
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

export { insertAnimalIntake, findIntakesByAnimalId };

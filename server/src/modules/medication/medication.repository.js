import pool from "../../config/db.js";

async function findMedicationById(medicationId, db = pool) {
  const result = await db.query(
    `
      SELECT
        m.medication_id,
        m.medical_record_id,
        m.animal_id,
        m.medication_name,
        m.dosage,
        m.frequency,
        m.start_date::text AS start_date,
        m.end_date::text AS end_date,
        m.instructions,
        m.status,
        m.status_reason,
        m.created_by,
        m.updated_by,
        m.created_at,
        m.updated_at,
        a.animal_code,
        a.animal_name
      FROM medications m
      JOIN animals a
        ON a.animal_id = m.animal_id
      WHERE m.medication_id = $1
    `,
    [medicationId],
  );

  return result.rows[0] || null;
}

async function insertMedication(data, db = pool) {
  const {
    animalId,
    medicalRecordId,
    medicationName,
    dosage,
    frequency,
    startDate,
    endDate,
    instructions,
    createdBy,
  } = data;

  const result = await db.query(
    `
      INSERT INTO medications (
        animal_id,
        medical_record_id,
        medication_name,
        dosage,
        frequency,
        start_date,
        end_date,
        instructions,
        created_by,
        updated_by
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $9
      )
      RETURNING
        medication_id,
        medical_record_id,
        animal_id,
        medication_name,
        dosage,
        frequency,
        start_date::text AS start_date,
        end_date::text AS end_date,
        instructions,
        status,
        status_reason,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [
      animalId,
      medicalRecordId,
      medicationName,
      dosage,
      frequency,
      startDate,
      endDate,
      instructions,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findMedications(db = pool) {
  const result = await db.query(
    `
      SELECT
        m.medication_id,
        m.medical_record_id,
        m.animal_id,
        m.medication_name,
        m.dosage,
        m.frequency,
        m.start_date::text AS start_date,
        m.end_date::text AS end_date,
        m.instructions,
        m.status,
        m.status_reason,
        m.created_by,
        m.updated_by,
        m.created_at,
        m.updated_at,
        a.animal_code,
        a.animal_name
      FROM medications m
      JOIN animals a
        ON a.animal_id = m.animal_id
      ORDER BY
        CASE
          WHEN m.status = 'ACTIVE' THEN 1
          ELSE 2
        END,
        m.start_date DESC,
        m.created_at DESC
    `,
  );

  return result.rows;
}

async function findMedicationsByAnimalId(animalId, db = pool) {
  const result = await db.query(
    `
      SELECT
        m.medication_id,
        m.medical_record_id,
        m.animal_id,
        m.medication_name,
        m.dosage,
        m.frequency,
        m.start_date::text AS start_date,
        m.end_date::text AS end_date,
        m.instructions,
        m.status,
        m.status_reason,
        m.created_by,
        m.updated_by,
        m.created_at,
        m.updated_at,
        a.animal_code,
        a.animal_name
      FROM medications m
      JOIN animals a
        ON a.animal_id = m.animal_id
      WHERE m.animal_id = $1
      ORDER BY
        CASE
          WHEN m.status = 'ACTIVE' THEN 1
          ELSE 2
        END,
        m.start_date DESC,
        m.created_at DESC
    `,
    [animalId],
  );

  return result.rows;
}

async function updateMedication(medicationId, updates, updatedBy, db = pool) {
  const fields = [];
  const values = [];

  let index = 1;

  if (Object.prototype.hasOwnProperty.call(updates, "animalId")) {
    fields.push(`animal_id = $${index}`);
    values.push(updates.animalId);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "medicalRecordId")) {
    fields.push(`medical_record_id = $${index}`);
    values.push(updates.medicalRecordId);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "medicationName")) {
    fields.push(`medication_name = $${index}`);
    values.push(updates.medicationName);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "dosage")) {
    fields.push(`dosage = $${index}`);
    values.push(updates.dosage);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "frequency")) {
    fields.push(`frequency = $${index}`);
    values.push(updates.frequency);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "startDate")) {
    fields.push(`start_date = $${index}`);
    values.push(updates.startDate);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "endDate")) {
    fields.push(`end_date = $${index}`);
    values.push(updates.endDate);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "instructions")) {
    fields.push(`instructions = $${index}`);
    values.push(updates.instructions);
    index++;
  }

  fields.push(`updated_by = $${index}`);
  values.push(updatedBy);
  index++;

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(medicationId);

  const result = await db.query(
    `
      UPDATE medications
      SET ${fields.join(", ")}
      WHERE medication_id = $${index}
        AND status = 'ACTIVE'
      RETURNING
        medication_id,
        medical_record_id,
        animal_id,
        medication_name,
        dosage,
        frequency,
        start_date::text AS start_date,
        end_date::text AS end_date,
        instructions,
        status,
        status_reason,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    values,
  );

  return result.rows[0] || null;
}

async function completeMedication(medicationId, updatedBy, db = pool) {
  const result = await db.query(
    `
      UPDATE medications
      SET
        status = 'COMPLETED',
        status_reason = NULL,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE medication_id = $1
        AND status = 'ACTIVE'
      RETURNING
        medication_id,
        medical_record_id,
        animal_id,
        medication_name,
        dosage,
        frequency,
        start_date::text AS start_date,
        end_date::text AS end_date,
        instructions,
        status,
        status_reason,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [medicationId, updatedBy],
  );

  return result.rows[0] || null;
}
async function discontinueMedication(
  medicationId,
  statusReason,
  updatedBy,
  db = pool,
) {
  const result = await db.query(
    `
      UPDATE medications
      SET
        status = 'DISCONTINUED',
        status_reason = $2,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE medication_id = $1
        AND status = 'ACTIVE'
      RETURNING
        medication_id,
        medical_record_id,
        animal_id,
        medication_name,
        dosage,
        frequency,
        start_date::text AS start_date,
        end_date::text AS end_date,
        instructions,
        status,
        status_reason,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [medicationId, statusReason, updatedBy],
  );

  return result.rows[0] || null;
}
export {
  findMedicationById,
  insertMedication,
  findMedications,
  findMedicationsByAnimalId,
  updateMedication,
  completeMedication,
  discontinueMedication,
};

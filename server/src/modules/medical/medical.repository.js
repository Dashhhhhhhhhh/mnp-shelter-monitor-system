import pool from "../../config/db.js";

async function findMedicalRecordById(medicalRecordId, db = pool) {
  const result = await db.query(
    `
      SELECT
        mr.medical_record_id,
        mr.animal_id,
        a.animal_code,
        a.animal_name,
        mr.observation_id,
        mr.medical_type,
        mr.medical_date::text AS medical_date,
        mr.reason,
        mr.clinic,
        mr.vet_name,
        mr.diagnosis,
        mr.treatment,
        mr.follow_up_date::text AS follow_up_date,
        mr.notes,
        mr.created_by,
        mr.updated_by,
        mr.created_at,
        mr.updated_at
      FROM medical_records mr
      JOIN animals a
        ON a.animal_id = mr.animal_id
      WHERE mr.medical_record_id = $1
    `,
    [medicalRecordId],
  );

  return result.rows[0] || null;
}

async function insertMedicalRecord(
  {
    animalId,
    observationId,
    medicalType,
    medicalDate,
    reason,
    clinic,
    vetName,
    diagnosis,
    treatment,
    followUpDate,
    notes,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO medical_records (
        animal_id,
        observation_id,
        medical_type,
        medical_date,
        reason,
        clinic,
        vet_name,
        diagnosis,
        treatment,
        follow_up_date,
        notes,
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
        $10,
        $11,
        $12,
        $12
      )
      RETURNING
        medical_record_id,
        animal_id,
        observation_id,
        medical_type,
        medical_date::text AS medical_date,
        reason,
        clinic,
        vet_name,
        diagnosis,
        treatment,
        follow_up_date::text AS follow_up_date,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [
      animalId,
      observationId,
      medicalType,
      medicalDate,
      reason,
      clinic,
      vetName,
      diagnosis,
      treatment,
      followUpDate,
      notes,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findMedicalRecords(db = pool) {
  const result = await db.query(
    `
      SELECT
        mr.medical_record_id,
        mr.animal_id,
        a.animal_code,
        a.animal_name,
        mr.observation_id,
        mr.medical_type,
        mr.medical_date::text AS medical_date,
        mr.reason,
        mr.clinic,
        mr.vet_name,
        mr.diagnosis,
        mr.treatment,
        mr.follow_up_date::text AS follow_up_date,
        mr.notes,
        mr.created_by,
        mr.updated_by,
        mr.created_at,
        mr.updated_at
      FROM medical_records mr
      JOIN animals a
        ON a.animal_id = mr.animal_id
      ORDER BY
        mr.medical_date DESC,
        mr.created_at DESC
    `,
  );

  return result.rows;
}

async function findMedicalRecordsByAnimalId(animalId, db = pool) {
  const result = await db.query(
    `
      SELECT
        mr.medical_record_id,
        mr.animal_id,
        a.animal_code,
        a.animal_name,
        mr.observation_id,
        mr.medical_type,
        mr.medical_date::text AS medical_date,
        mr.reason,
        mr.clinic,
        mr.vet_name,
        mr.diagnosis,
        mr.treatment,
        mr.follow_up_date::text AS follow_up_date,
        mr.notes,
        mr.created_by,
        mr.updated_by,
        mr.created_at,
        mr.updated_at
      FROM medical_records mr
      JOIN animals a
        ON a.animal_id = mr.animal_id
      WHERE mr.animal_id = $1
      ORDER BY
        mr.medical_date DESC,
        mr.created_at DESC
    `,
    [animalId],
  );

  return result.rows;
}

async function updateMedicalRecord(
  medicalRecordId,
  updates,
  updatedBy,
  db = pool,
) {
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (Object.prototype.hasOwnProperty.call(updates, "animalId")) {
    addField("animal_id", updates.animalId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "observationId")) {
    addField("observation_id", updates.observationId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "medicalType")) {
    addField("medical_type", updates.medicalType);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "medicalDate")) {
    addField("medical_date", updates.medicalDate);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "reason")) {
    addField("reason", updates.reason);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "clinic")) {
    addField("clinic", updates.clinic);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "vetName")) {
    addField("vet_name", updates.vetName);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "diagnosis")) {
    addField("diagnosis", updates.diagnosis);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "treatment")) {
    addField("treatment", updates.treatment);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "followUpDate")) {
    addField("follow_up_date", updates.followUpDate);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "notes")) {
    addField("notes", updates.notes);
  }

  values.push(updatedBy);
  fields.push(`updated_by = $${values.length}`);

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(medicalRecordId);
  const medicalRecordIdPosition = values.length;

  const result = await db.query(
    `
      UPDATE medical_records
      SET
        ${fields.join(", ")}
      WHERE medical_record_id = $${medicalRecordIdPosition}
      RETURNING
        medical_record_id,
        animal_id,
        observation_id,
        medical_type,
        medical_date::text AS medical_date,
        reason,
        clinic,
        vet_name,
        diagnosis,
        treatment,
        follow_up_date::text AS follow_up_date,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    values,
  );

  return result.rows[0] || null;
}

export {
  findMedicalRecordById,
  insertMedicalRecord,
  findMedicalRecords,
  findMedicalRecordsByAnimalId,
  updateMedicalRecord,
};

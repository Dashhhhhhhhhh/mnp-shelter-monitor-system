import pool from "../../config/db.js";

async function findPreventiveCareById(preventiveCareId, db = pool) {
  const result = await db.query(
    `
      SELECT
        p.preventive_care_id,
        p.animal_id,
        p.medical_record_id,
        p.care_type,
        p.date_given::text AS date_given,
        p.product_name,
        p.dose,
        p.next_due_date::text AS next_due_date,
        p.clinic,
        p.vet_name,
        p.notes,
        p.created_by,
        p.updated_by,
        p.created_at,
        p.updated_at,
        a.animal_code,
        a.animal_name
      FROM preventive_care_records p
      JOIN animals a
        ON a.animal_id = p.animal_id
      WHERE p.preventive_care_id = $1
    `,
    [preventiveCareId],
  );

  return result.rows[0] || null;
}

async function insertPreventiveCare(data, db = pool) {
  const {
    animalId,
    medicalRecordId,
    careType,
    dateGiven,
    productName,
    dose,
    nextDueDate,
    clinic,
    vetName,
    notes,
    createdBy,
  } = data;

  const result = await db.query(
    `
      INSERT INTO preventive_care_records (
        animal_id,
        medical_record_id,
        care_type,
        date_given,
        product_name,
        dose,
        next_due_date,
        clinic,
        vet_name,
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
        $11
      )
      RETURNING
        preventive_care_id,
        animal_id,
        medical_record_id,
        care_type,
        date_given::text AS date_given,
        product_name,
        dose,
        next_due_date::text AS next_due_date,
        clinic,
        vet_name,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [
      animalId,
      medicalRecordId,
      careType,
      dateGiven,
      productName,
      dose,
      nextDueDate,
      clinic,
      vetName,
      notes,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findPreventiveCareRecords(db = pool) {
  const result = await db.query(
    `
      SELECT
        p.preventive_care_id,
        p.animal_id,
        p.medical_record_id,
        p.care_type,
        p.date_given::text AS date_given,
        p.product_name,
        p.dose,
        p.next_due_date::text AS next_due_date,
        p.clinic,
        p.vet_name,
        p.notes,
        p.created_by,
        p.updated_by,
        p.created_at,
        p.updated_at,
        a.animal_code,
        a.animal_name
      FROM preventive_care_records p
      JOIN animals a
        ON a.animal_id = p.animal_id
      ORDER BY
        p.date_given DESC,
        p.created_at DESC
    `,
  );

  return result.rows;
}

async function findPreventiveCareByAnimalId(animalId, db = pool) {
  const result = await db.query(
    `
      SELECT
        p.preventive_care_id,
        p.animal_id,
        p.medical_record_id,
        p.care_type,
        p.date_given::text AS date_given,
        p.product_name,
        p.dose,
        p.next_due_date::text AS next_due_date,
        p.clinic,
        p.vet_name,
        p.notes,
        p.created_by,
        p.updated_by,
        p.created_at,
        p.updated_at,
        a.animal_code,
        a.animal_name
      FROM preventive_care_records p
      JOIN animals a
        ON a.animal_id = p.animal_id
      WHERE p.animal_id = $1
      ORDER BY
        p.date_given DESC,
        p.created_at DESC
    `,
    [animalId],
  );

  return result.rows;
}

async function updatePreventiveCare(
  preventiveCareId,
  updates,
  updatedBy,
  db = pool,
) {
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

  if (Object.prototype.hasOwnProperty.call(updates, "careType")) {
    fields.push(`care_type = $${index}`);
    values.push(updates.careType);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "dateGiven")) {
    fields.push(`date_given = $${index}`);
    values.push(updates.dateGiven);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "productName")) {
    fields.push(`product_name = $${index}`);
    values.push(updates.productName);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "dose")) {
    fields.push(`dose = $${index}`);
    values.push(updates.dose);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "nextDueDate")) {
    fields.push(`next_due_date = $${index}`);
    values.push(updates.nextDueDate);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "clinic")) {
    fields.push(`clinic = $${index}`);
    values.push(updates.clinic);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "vetName")) {
    fields.push(`vet_name = $${index}`);
    values.push(updates.vetName);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "notes")) {
    fields.push(`notes = $${index}`);
    values.push(updates.notes);
    index++;
  }

  fields.push(`updated_by = $${index}`);
  values.push(updatedBy);
  index++;

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(preventiveCareId);

  const result = await db.query(
    `
      UPDATE preventive_care_records
      SET ${fields.join(", ")}
      WHERE preventive_care_id = $${index}
      RETURNING
        preventive_care_id,
        animal_id,
        medical_record_id,
        care_type,
        date_given::text AS date_given,
        product_name,
        dose,
        next_due_date::text AS next_due_date,
        clinic,
        vet_name,
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
  findPreventiveCareById,
  insertPreventiveCare,
  findPreventiveCareRecords,
  findPreventiveCareByAnimalId,
  updatePreventiveCare,
};

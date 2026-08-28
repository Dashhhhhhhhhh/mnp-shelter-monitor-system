import {
  findPreventiveCareById,
  insertPreventiveCare,
  findPreventiveCareRecords,
  findPreventiveCareByAnimalId,
  updatePreventiveCare,
} from "./preventiveCare.repository.js";

import {
  validatePreventiveCareId,
  validateAnimalId,
  validateCreatePreventiveCareInput,
  validateUpdatePreventiveCareInput,
} from "./preventiveCare.validation.js";

import { findAnimalById } from "../animals/animal.repository.js";

import { findMedicalRecordById } from "../medical/medical.repository.js";

function mapPreventiveCare(record) {
  return {
    preventiveCareId: record.preventive_care_id,
    animalId: record.animal_id,
    medicalRecordId: record.medical_record_id,

    animalCode: record.animal_code,
    animalName: record.animal_name,

    careType: record.care_type,
    dateGiven: record.date_given,

    productName: record.product_name,
    dose: record.dose,
    nextDueDate: record.next_due_date,

    clinic: record.clinic,
    vetName: record.vet_name,
    notes: record.notes,

    dueStatus: getDueStatus(record.next_due_date),

    createdBy: record.created_by,
    updatedBy: record.updated_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function getManilaDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function getDueStatus(nextDueDate) {
  if (!nextDueDate) {
    return "NO_DUE_DATE";
  }

  const today = getManilaDate();

  if (nextDueDate < today) {
    return "OVERDUE";
  }

  if (nextDueDate === today) {
    return "DUE";
  }

  return "UPCOMING";
}

async function validatePreventiveCareContext(animalId, medicalRecordId) {
  const animal = await findAnimalById(animalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  if (!medicalRecordId) {
    return;
  }

  const medicalRecord = await findMedicalRecordById(medicalRecordId);

  if (!medicalRecord) {
    const error = new Error("Medical record not found");
    error.statusCode = 404;
    throw error;
  }

  if (medicalRecord.animal_id !== animalId) {
    const error = new Error(
      "Medical record animal does not match the preventive care animal",
    );
    error.statusCode = 409;
    throw error;
  }
}

function validateDateGivenAgainstToday(dateGiven) {
  const today = getManilaDate();

  if (dateGiven > today) {
    const error = new Error("Date given cannot be in the future");
    error.statusCode = 409;
    throw error;
  }
}

async function createPreventiveCareService(data, createdBy) {
  const validated = validateCreatePreventiveCareInput(data);

  validateDateGivenAgainstToday(validated.dateGiven);

  await validatePreventiveCareContext(
    validated.animalId,
    validated.medicalRecordId,
  );

  const preventiveCare = await insertPreventiveCare({
    ...validated,
    createdBy,
  });

  return mapPreventiveCare(preventiveCare);
}

async function getPreventiveCareService(preventiveCareId) {
  const validPreventiveCareId = validatePreventiveCareId(preventiveCareId);

  const preventiveCare = await findPreventiveCareById(validPreventiveCareId);

  if (!preventiveCare) {
    const error = new Error("Preventive care record not found");
    error.statusCode = 404;
    throw error;
  }

  return mapPreventiveCare(preventiveCare);
}

async function getPreventiveCareRecordsService() {
  const records = await findPreventiveCareRecords();

  return records.map(mapPreventiveCare);
}

async function getAnimalPreventiveCareService(animalId) {
  const validAnimalId = validateAnimalId(animalId);

  const animal = await findAnimalById(validAnimalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  const records = await findPreventiveCareByAnimalId(validAnimalId);

  return records.map(mapPreventiveCare);
}

async function updatePreventiveCareService(preventiveCareId, data, updatedBy) {
  const validPreventiveCareId = validatePreventiveCareId(preventiveCareId);

  const validatedUpdates = validateUpdatePreventiveCareInput(data);

  const existingRecord = await findPreventiveCareById(validPreventiveCareId);

  if (!existingRecord) {
    const error = new Error("Preventive care record not found");
    error.statusCode = 404;
    throw error;
  }

  const hasAnimalId = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "animalId",
  );

  const hasMedicalRecordId = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "medicalRecordId",
  );

  if (hasAnimalId || hasMedicalRecordId) {
    const nextAnimalId = hasAnimalId
      ? validatedUpdates.animalId
      : existingRecord.animal_id;

    const nextMedicalRecordId = hasMedicalRecordId
      ? validatedUpdates.medicalRecordId
      : existingRecord.medical_record_id;

    await validatePreventiveCareContext(nextAnimalId, nextMedicalRecordId);
  }

  const hasDateGiven = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "dateGiven",
  );

  const hasNextDueDate = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "nextDueDate",
  );

  if (hasDateGiven || hasNextDueDate) {
    const nextDateGiven = hasDateGiven
      ? validatedUpdates.dateGiven
      : existingRecord.date_given;

    const nextDueDate = hasNextDueDate
      ? validatedUpdates.nextDueDate
      : existingRecord.next_due_date;

    validateDateGivenAgainstToday(nextDateGiven);

    if (nextDueDate && nextDueDate < nextDateGiven) {
      const error = new Error(
        "Next due date cannot be earlier than date given",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedRecord = await updatePreventiveCare(
    validPreventiveCareId,
    validatedUpdates,
    updatedBy,
  );

  if (!updatedRecord) {
    const error = new Error("Preventive care record could not be updated");
    error.statusCode = 409;
    throw error;
  }

  return mapPreventiveCare(updatedRecord);
}

export {
  createPreventiveCareService,
  getPreventiveCareService,
  getPreventiveCareRecordsService,
  getAnimalPreventiveCareService,
  updatePreventiveCareService,
};

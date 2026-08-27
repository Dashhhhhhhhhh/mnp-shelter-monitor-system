import {
  findMedicalRecordById,
  insertMedicalRecord,
  findMedicalRecords,
  findMedicalRecordsByAnimalId,
  updateMedicalRecord,
} from "./medical.repository.js";

import {
  validateMedicalRecordId,
  validateAnimalId,
  validateCreateMedicalRecordInput,
  validateUpdateMedicalRecordInput,
} from "./medical.validation.js";

import { findAnimalById } from "../animals/animal.repository.js";

import { findObservationById } from "../observations/observation.repository.js";

function mapMedicalRecord(record) {
  return {
    medicalRecordId: record.medical_record_id,
    animalId: record.animal_id,

    animalCode: record.animal_code ?? undefined,
    animalName: record.animal_name ?? undefined,

    observationId: record.observation_id,

    medicalType: record.medical_type,
    medicalDate: record.medical_date,

    reason: record.reason,

    clinic: record.clinic,
    vetName: record.vet_name,

    diagnosis: record.diagnosis,
    treatment: record.treatment,

    followUpDate: record.follow_up_date,

    notes: record.notes,

    createdBy: record.created_by,
    updatedBy: record.updated_by,

    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

async function validateMedicalContext(animalId, observationId) {
  const animal = await findAnimalById(animalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  // Observation linkage is optional.
  if (!observationId) {
    return {
      animal,
      observation: null,
    };
  }

  const observation = await findObservationById(observationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  if (observation.status !== "ESCALATED_TO_MEDICAL") {
    const error = new Error(
      "Only observations escalated to medical can be linked to a medical record",
    );
    error.statusCode = 409;
    throw error;
  }

  if (!observation.animal_id) {
    const error = new Error(
      "Cage-level observations cannot be linked directly to an animal medical record",
    );
    error.statusCode = 409;
    throw error;
  }

  if (observation.animal_id !== animalId) {
    const error = new Error(
      "Observation animal does not match the medical record animal",
    );
    error.statusCode = 409;
    throw error;
  }

  return {
    animal,
    observation,
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

function validateMedicalDateAgainstToday(medicalDate) {
  const today = getManilaDate();

  if (medicalDate > today) {
    const error = new Error("Medical date cannot be in the future");
    error.statusCode = 409;
    throw error;
  }
}

async function createMedicalRecord(data, createdBy) {
  const validated = validateCreateMedicalRecordInput(data);

  validateMedicalDateAgainstToday(validated.medicalDate);

  await validateMedicalContext(validated.animalId, validated.observationId);

  const medicalRecord = await insertMedicalRecord({
    ...validated,
    createdBy,
  });

  return mapMedicalRecord(medicalRecord);
}

async function getMedicalRecordById(medicalRecordId) {
  const validMedicalRecordId = validateMedicalRecordId(medicalRecordId);

  const medicalRecord = await findMedicalRecordById(validMedicalRecordId);

  if (!medicalRecord) {
    const error = new Error("Medical record not found");
    error.statusCode = 404;
    throw error;
  }

  return mapMedicalRecord(medicalRecord);
}

async function getMedicalRecords() {
  const medicalRecords = await findMedicalRecords();

  return medicalRecords.map(mapMedicalRecord);
}

async function getAnimalMedicalRecords(animalId) {
  const validAnimalId = validateAnimalId(animalId);

  const animal = await findAnimalById(validAnimalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  const medicalRecords = await findMedicalRecordsByAnimalId(validAnimalId);

  return medicalRecords.map(mapMedicalRecord);
}

async function updateMedicalRecordService(medicalRecordId, data, updatedBy) {
  const validMedicalRecordId = validateMedicalRecordId(medicalRecordId);

  const validatedUpdates = validateUpdateMedicalRecordInput(data);

  const existing = await findMedicalRecordById(validMedicalRecordId);

  if (!existing) {
    const error = new Error("Medical record not found");
    error.statusCode = 404;
    throw error;
  }

  const hasAnimalId = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "animalId",
  );

  const hasObservationId = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "observationId",
  );

  const hasMedicalDate = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "medicalDate",
  );

  const hasFollowUpDate = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "followUpDate",
  );

  const finalAnimalId = hasAnimalId
    ? validatedUpdates.animalId
    : existing.animal_id;

  const finalObservationId = hasObservationId
    ? validatedUpdates.observationId
    : existing.observation_id;

  const finalMedicalDate = hasMedicalDate
    ? validatedUpdates.medicalDate
    : existing.medical_date;

  const finalFollowUpDate = hasFollowUpDate
    ? validatedUpdates.followUpDate
    : existing.follow_up_date;

  const contextChanged = hasAnimalId || hasObservationId;

  if (contextChanged) {
    await validateMedicalContext(finalAnimalId, finalObservationId);
  }

  const datesChanged = hasMedicalDate || hasFollowUpDate;

  if (datesChanged) {
    if (hasMedicalDate) {
      validateMedicalDateAgainstToday(finalMedicalDate);
    }

    if (finalFollowUpDate && finalFollowUpDate < finalMedicalDate) {
      const error = new Error(
        "Follow-up date cannot be earlier than medical date",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const updated = await updateMedicalRecord(
    validMedicalRecordId,
    validatedUpdates,
    updatedBy,
  );

  if (!updated) {
    const error = new Error("Medical record could not be updated");
    error.statusCode = 409;
    throw error;
  }

  return mapMedicalRecord(updated);
}

export {
  createMedicalRecord,
  getMedicalRecordById,
  getMedicalRecords,
  getAnimalMedicalRecords,
  updateMedicalRecordService,
};

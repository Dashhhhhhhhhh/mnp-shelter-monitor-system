import {
  findMedicationById,
  insertMedication,
  findMedications,
  findMedicationsByAnimalId,
  updateMedication,
  completeMedication,
  discontinueMedication,
} from "./medication.repository.js";

import {
  validateMedicationId,
  validateAnimalId,
  validateCreateMedicationInput,
  validateUpdateMedicationInput,
  validateDiscontinueMedicationInput,
} from "./medication.validation.js";

import { findAnimalById } from "../animals/animal.repository.js";

import { findMedicalRecordById } from "../medical/medical.repository.js";

function mapMedication(record) {
  return {
    medicationId: record.medication_id,
    medicalRecordId: record.medical_record_id,
    animalId: record.animal_id,

    animalCode: record.animal_code,
    animalName: record.animal_name,

    medicationName: record.medication_name,
    dosage: record.dosage,
    frequency: record.frequency,

    startDate: record.start_date,
    endDate: record.end_date,

    instructions: record.instructions,

    status: record.status,
    statusReason: record.status_reason,

    createdBy: record.created_by,
    updatedBy: record.updated_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

async function validateMedicationContext(animalId, medicalRecordId) {
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
      "Medical record animal does not match the medication animal",
    );
    error.statusCode = 409;
    throw error;
  }
}

async function createMedicationService(data, createdBy) {
  const validated = validateCreateMedicationInput(data);

  await validateMedicationContext(
    validated.animalId,
    validated.medicalRecordId,
  );

  const medication = await insertMedication({
    ...validated,
    createdBy,
  });

  return mapMedication(medication);
}

async function getMedicationService(medicationId) {
  const validMedicationId = validateMedicationId(medicationId);

  const medication = await findMedicationById(validMedicationId);

  if (!medication) {
    const error = new Error("Medication not found");
    error.statusCode = 404;
    throw error;
  }

  return mapMedication(medication);
}

async function getMedicationsService() {
  const medications = await findMedications();

  return medications.map(mapMedication);
}

async function getAnimalMedicationsService(animalId) {
  const validAnimalId = validateAnimalId(animalId);

  const animal = await findAnimalById(validAnimalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  const medications = await findMedicationsByAnimalId(validAnimalId);

  return medications.map(mapMedication);
}

async function updateMedicationService(medicationId, data, updatedBy) {
  const validMedicationId = validateMedicationId(medicationId);

  const validatedUpdates = validateUpdateMedicationInput(data);

  const existingMedication = await findMedicationById(validMedicationId);

  if (!existingMedication) {
    const error = new Error("Medication not found");
    error.statusCode = 404;
    throw error;
  }

  if (existingMedication.status !== "ACTIVE") {
    const error = new Error("Only active medications can be updated");
    error.statusCode = 409;
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

  const relationshipChanged = hasAnimalId || hasMedicalRecordId;

  if (relationshipChanged) {
    const nextAnimalId = hasAnimalId
      ? validatedUpdates.animalId
      : existingMedication.animal_id;

    const nextMedicalRecordId = hasMedicalRecordId
      ? validatedUpdates.medicalRecordId
      : existingMedication.medical_record_id;

    await validateMedicationContext(nextAnimalId, nextMedicalRecordId);
  }

  const hasStartDate = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "startDate",
  );

  const hasEndDate = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "endDate",
  );

  const datesChanged = hasStartDate || hasEndDate;

  if (datesChanged) {
    const nextStartDate = hasStartDate
      ? validatedUpdates.startDate
      : existingMedication.start_date;

    const nextEndDate = hasEndDate
      ? validatedUpdates.endDate
      : existingMedication.end_date;

    if (nextEndDate && nextEndDate < nextStartDate) {
      const error = new Error("End date cannot be earlier than start date");
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedMedication = await updateMedication(
    validMedicationId,
    validatedUpdates,
    updatedBy,
  );

  if (!updatedMedication) {
    const error = new Error(
      "Medication is no longer active and cannot be updated",
    );
    error.statusCode = 409;
    throw error;
  }

  return mapMedication(updatedMedication);
}

async function completeMedicationService(medicationId, updatedBy) {
  const validMedicationId = validateMedicationId(medicationId);

  const existingMedication = await findMedicationById(validMedicationId);

  if (!existingMedication) {
    const error = new Error("Medication not found");
    error.statusCode = 404;
    throw error;
  }

  if (existingMedication.status !== "ACTIVE") {
    const error = new Error("Only active medications can be completed");
    error.statusCode = 409;
    throw error;
  }

  const completedMedication = await completeMedication(
    validMedicationId,
    updatedBy,
  );

  if (!completedMedication) {
    const error = new Error(
      "Medication is no longer active and cannot be completed",
    );
    error.statusCode = 409;
    throw error;
  }

  return mapMedication(completedMedication);
}
async function discontinueMedicationService(medicationId, data, updatedBy) {
  const validMedicationId = validateMedicationId(medicationId);

  const validated = validateDiscontinueMedicationInput(data);

  const existingMedication = await findMedicationById(validMedicationId);

  if (!existingMedication) {
    const error = new Error("Medication not found");
    error.statusCode = 404;
    throw error;
  }

  if (existingMedication.status !== "ACTIVE") {
    const error = new Error("Only active medications can be discontinued");
    error.statusCode = 409;
    throw error;
  }

  const discontinuedMedication = await discontinueMedication(
    validMedicationId,
    validated.reason,
    updatedBy,
  );

  if (!discontinuedMedication) {
    const error = new Error(
      "Medication is no longer active and cannot be discontinued",
    );
    error.statusCode = 409;
    throw error;
  }

  return mapMedication(discontinuedMedication);
}

export {
  createMedicationService,
  getMedicationService,
  getMedicationsService,
  getAnimalMedicationsService,
  updateMedicationService,
  completeMedicationService,
  discontinueMedicationService,
};

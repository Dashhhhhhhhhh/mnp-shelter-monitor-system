import { validateAnimalId } from "../animals/animal.validation.js";
import { findAnimalById } from "../animals/animal.repository.js";
import { findUserById } from "../users/user.repository.js";

import { createHash } from "node:crypto";

import {
  validateCreateIntakeInput,
  validateIntakeId,
  validateUpdateIntakeInput,
  validateIdempotencyKey,
} from "./intake.validation.js";

import {
  insertAnimalIntake,
  findIntakesByAnimalId,
  findIntakeById,
  updateIntakeRecord,
  findIntakeByIdempotencyKey,
} from "./intake.repository.js";

function createIntakeRequestHash({
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
}) {
  const requestData = {
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
  };

  return createHash("sha256").update(JSON.stringify(requestData)).digest("hex");
}

async function validateIntakeSourceDetails({
  intakeSource,
  rescuedByUserId,
  outsideRescuerName,
  outsideRescuerContact,
}) {
  let finalRescuedByUserId = rescuedByUserId;
  let finalOutsideRescuerName = outsideRescuerName;
  let finalOutsideRescuerContact = outsideRescuerContact;

  if (intakeSource === "OUTSIDE_PERSON") {
    finalRescuedByUserId = null;
  }

  if (intakeSource === "MNP_VOLUNTEER" || intakeSource === "FOUND_BY_MNP") {
    finalOutsideRescuerName = null;
    finalOutsideRescuerContact = null;
  }

  if (intakeSource === "MNP_VOLUNTEER" && !finalRescuedByUserId) {
    const error = new Error(
      "Rescued by user ID is required for MNP volunteer intake",
    );
    error.statusCode = 400;
    throw error;
  }

  if (intakeSource === "OUTSIDE_PERSON" && !finalOutsideRescuerName) {
    const error = new Error(
      "Outside rescuer name is required for outside person intake",
    );
    error.statusCode = 400;
    throw error;
  }

  if (finalRescuedByUserId) {
    const rescuer = await findUserById(finalRescuedByUserId);

    if (!rescuer) {
      const error = new Error("Rescuer user not found");
      error.statusCode = 400;
      throw error;
    }

    if (!rescuer.is_active) {
      const error = new Error("Rescuer account is inactive");
      error.statusCode = 400;
      throw error;
    }

    if (
      intakeSource === "MNP_VOLUNTEER" &&
      !["ADMIN", "VOLUNTEER"].includes(rescuer.role_name)
    ) {
      const error = new Error(
        "MNP volunteer rescuer must be an ADMIN or VOLUNTEER",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    rescuedByUserId: finalRescuedByUserId,
    outsideRescuerName: finalOutsideRescuerName,
    outsideRescuerContact: finalOutsideRescuerContact,
  };
}

async function createAnimalIntake(
  animalId,
  intakeData,
  createdBy,
  idempotencyKey,
) {
  const validAnimalId = validateAnimalId(animalId);

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const animal = await findAnimalById(validAnimalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  const {
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
  } = validateCreateIntakeInput(intakeData);

  const {
    rescuedByUserId: finalRescuedByUserId,
    outsideRescuerName: finalOutsideRescuerName,
    outsideRescuerContact: finalOutsideRescuerContact,
  } = await validateIntakeSourceDetails({
    intakeSource,
    rescuedByUserId,
    outsideRescuerName,
    outsideRescuerContact,
  });

  const idempotencyRequestHash = createIntakeRequestHash({
    animalId: validAnimalId,
    intakeDate,
    intakeCategory,
    intakeSource,
    foundLocation,
    ageAtIntake,
    observedCondition,
    rescuedByUserId: finalRescuedByUserId,
    outsideRescuerName: finalOutsideRescuerName,
    outsideRescuerContact: finalOutsideRescuerContact,
    notes,
  });

  let createdIntake;
  let isReplay = false;

  try {
    createdIntake = await insertAnimalIntake({
      animalId: validAnimalId,
      intakeDate,
      intakeCategory,
      intakeSource,
      foundLocation,
      ageAtIntake,
      observedCondition,
      rescuedByUserId: finalRescuedByUserId,
      outsideRescuerName: finalOutsideRescuerName,
      outsideRescuerContact: finalOutsideRescuerContact,
      notes,
      createdBy,
      idempotencyKey: validIdempotencyKey,
      idempotencyRequestHash,
    });
  } catch (error) {
    if (
      error.code !== "23505" ||
      error.constraint !== "uq_animal_intakes_created_by_idempotency_key"
    ) {
      throw error;
    }

    const existingIntake = await findIntakeByIdempotencyKey(
      createdBy,
      validIdempotencyKey,
    );

    if (!existingIntake) {
      throw error;
    }

    if (existingIntake.idempotency_request_hash !== idempotencyRequestHash) {
      const conflictError = new Error(
        "Idempotency key has already been used for a different intake request",
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    createdIntake = existingIntake;
    isReplay = true;
  }

  return {
    intake: {
      intakeId: createdIntake.intake_id,
      animalId: createdIntake.animal_id,
      intakeDate: createdIntake.intake_date,
      intakeCategory: createdIntake.intake_category,
      intakeSource: createdIntake.intake_source,
      foundLocation: createdIntake.found_location,
      ageAtIntake: createdIntake.age_at_intake,
      observedCondition: createdIntake.observed_condition,
      rescuedByUserId: createdIntake.rescued_by_user_id,
      outsideRescuerName: createdIntake.outside_rescuer_name,
      outsideRescuerContact: createdIntake.outside_rescuer_contact,
      notes: createdIntake.notes,
      createdBy: createdIntake.created_by,
      updatedBy: createdIntake.updated_by,
      createdAt: createdIntake.created_at,
      updatedAt: createdIntake.updated_at,
    },
    isReplay,
  };
}

async function getAnimalIntakes(animalId) {
  const validAnimalId = validateAnimalId(animalId);

  const animal = await findAnimalById(validAnimalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  const intakes = await findIntakesByAnimalId(validAnimalId);

  return intakes.map((intake) => ({
    intakeId: intake.intake_id,
    animalId: intake.animal_id,
    intakeDate: intake.intake_date,
    intakeCategory: intake.intake_category,
    intakeSource: intake.intake_source,
    foundLocation: intake.found_location,
    ageAtIntake: intake.age_at_intake,
    observedCondition: intake.observed_condition,
    rescuedByUserId: intake.rescued_by_user_id,
    outsideRescuerName: intake.outside_rescuer_name,
    outsideRescuerContact: intake.outside_rescuer_contact,
    notes: intake.notes,
    createdBy: intake.created_by,
    updatedBy: intake.updated_by,
    createdAt: intake.created_at,
    updatedAt: intake.updated_at,
  }));
}

async function getIntakeById(intakeId) {
  const validIntakeId = validateIntakeId(intakeId);

  const intake = await findIntakeById(validIntakeId);

  if (!intake) {
    const error = new Error("Intake not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    intakeId: intake.intake_id,
    animalId: intake.animal_id,
    intakeDate: intake.intake_date,
    intakeCategory: intake.intake_category,
    intakeSource: intake.intake_source,
    foundLocation: intake.found_location,
    ageAtIntake: intake.age_at_intake,
    observedCondition: intake.observed_condition,
    rescuedByUserId: intake.rescued_by_user_id,
    outsideRescuerName: intake.outside_rescuer_name,
    outsideRescuerContact: intake.outside_rescuer_contact,
    notes: intake.notes,
    createdBy: intake.created_by,
    updatedBy: intake.updated_by,
    createdAt: intake.created_at,
    updatedAt: intake.updated_at,
  };
}

async function updateIntake(intakeId, intakeData, updatedBy) {
  const validIntakeId = validateIntakeId(intakeId);

  const existingIntake = await findIntakeById(validIntakeId);

  if (!existingIntake) {
    const error = new Error("Intake not found");
    error.statusCode = 404;
    throw error;
  }

  const updates = validateUpdateIntakeInput(intakeData);

  const finalIntakeSource =
    updates.intakeSource ?? existingIntake.intake_source;

  const candidateRescuedByUserId =
    updates.rescuedByUserId !== undefined
      ? updates.rescuedByUserId
      : existingIntake.rescued_by_user_id;

  const candidateOutsideRescuerName =
    updates.outsideRescuerName !== undefined
      ? updates.outsideRescuerName
      : existingIntake.outside_rescuer_name;

  const candidateOutsideRescuerContact =
    updates.outsideRescuerContact !== undefined
      ? updates.outsideRescuerContact
      : existingIntake.outside_rescuer_contact;

  const {
    rescuedByUserId: finalRescuedByUserId,
    outsideRescuerName: finalOutsideRescuerName,
    outsideRescuerContact: finalOutsideRescuerContact,
  } = await validateIntakeSourceDetails({
    intakeSource: finalIntakeSource,
    rescuedByUserId: candidateRescuedByUserId,
    outsideRescuerName: candidateOutsideRescuerName,
    outsideRescuerContact: candidateOutsideRescuerContact,
  });

  if (finalRescuedByUserId !== existingIntake.rescued_by_user_id) {
    updates.rescuedByUserId = finalRescuedByUserId;
  }

  if (finalOutsideRescuerName !== existingIntake.outside_rescuer_name) {
    updates.outsideRescuerName = finalOutsideRescuerName;
  }

  if (finalOutsideRescuerContact !== existingIntake.outside_rescuer_contact) {
    updates.outsideRescuerContact = finalOutsideRescuerContact;
  }
  const updatedIntake = await updateIntakeRecord(
    validIntakeId,
    updates,
    updatedBy,
  );

  return {
    intakeId: updatedIntake.intake_id,
    animalId: updatedIntake.animal_id,
    intakeDate: updatedIntake.intake_date,
    intakeCategory: updatedIntake.intake_category,
    intakeSource: updatedIntake.intake_source,
    foundLocation: updatedIntake.found_location,
    ageAtIntake: updatedIntake.age_at_intake,
    observedCondition: updatedIntake.observed_condition,
    rescuedByUserId: updatedIntake.rescued_by_user_id,
    outsideRescuerName: updatedIntake.outside_rescuer_name,
    outsideRescuerContact: updatedIntake.outside_rescuer_contact,
    notes: updatedIntake.notes,
    createdBy: updatedIntake.created_by,
    updatedBy: updatedIntake.updated_by,
    createdAt: updatedIntake.created_at,
    updatedAt: updatedIntake.updated_at,
  };
}

export { createAnimalIntake, getAnimalIntakes, getIntakeById, updateIntake };

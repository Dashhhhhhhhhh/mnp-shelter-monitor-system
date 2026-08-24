import { validateAnimalId } from "../animals/animal.validation.js";
import { findAnimalById } from "../animals/animal.repository.js";
import { findUserById } from "../users/user.repository.js";

import {
  validateCreateIntakeInput,
  validateIntakeId,
} from "./intake.validation.js";
import {
  insertAnimalIntake,
  findIntakesByAnimalId,
  findIntakeById,
} from "./intake.repository.js";

async function createAnimalIntake(animalId, intakeData, createdBy) {
  const validAnimalId = validateAnimalId(animalId);

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

  if (rescuedByUserId) {
    const rescuer = await findUserById(rescuedByUserId);

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

  const createdIntake = await insertAnimalIntake({
    animalId: validAnimalId,
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
  });

  return {
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

export { createAnimalIntake, getAnimalIntakes, getIntakeById };

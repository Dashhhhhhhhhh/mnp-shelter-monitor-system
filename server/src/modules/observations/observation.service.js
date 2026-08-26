import {
  findObservationById,
  insertObservation,
  findObservations,
  updateObservationDetails,
  claimObservation,
  updateObservationStatus,
  takeOverObservation,
} from "./observation.repository.js";

import {
  validateObservationId,
  validateCreateObservationInput,
  validateUpdateObservationInput,
} from "./observation.validation.js";

import { findCageById } from "../cages/cage.repository.js";

import { findAnimalById } from "../animals/animal.repository.js";

import { findActiveAssignmentByAnimalId } from "../cage_assignments/cageAssignment.repository.js";

function mapObservation(observation) {
  return {
    observationId: observation.observation_id,

    cageId: observation.cage_id,

    cageCode: observation.cage_code ?? undefined,

    speciesGroup: observation.species_group ?? undefined,

    animalId: observation.animal_id,

    animalCode: observation.animal_code ?? undefined,

    animalName: observation.animal_name ?? undefined,

    observationType: observation.observation_type,

    urgency: observation.urgency,

    status: observation.status,

    notes: observation.notes,

    photo: observation.photo,

    createdBy: observation.created_by,

    handledBy: observation.handled_by,

    updatedBy: observation.updated_by,

    createdAt: observation.created_at,

    updatedAt: observation.updated_at,

    resolvedAt: observation.resolved_at,
  };
}

async function validateObservationContext(cageId, animalId) {
  const cage = await findCageById(cageId);

  if (!cage) {
    const error = new Error("Cage not found");
    error.statusCode = 404;
    throw error;
  }

  if (cage.status !== "ACTIVE") {
    const error = new Error(
      "Observations can only be created for active cages",
    );
    error.statusCode = 409;
    throw error;
  }

  if (!animalId) {
    return {
      cage,
      animal: null,
    };
  }

  const animal = await findAnimalById(animalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  if (animal.status !== "ACTIVE") {
    const error = new Error("Observation animal must be active");
    error.statusCode = 409;
    throw error;
  }

  const activeAssignment = await findActiveAssignmentByAnimalId(animalId);

  if (!activeAssignment) {
    const error = new Error("Animal does not have an active cage assignment");
    error.statusCode = 409;
    throw error;
  }

  if (activeAssignment.cage_id !== cageId) {
    const error = new Error(
      "Animal is not currently assigned to the selected cage",
    );
    error.statusCode = 409;
    throw error;
  }

  return {
    cage,
    animal,
  };
}

async function createObservation(data, createdBy) {
  const validated = validateCreateObservationInput(data);

  await validateObservationContext(validated.cageId, validated.animalId);

  const observation = await insertObservation({
    ...validated,
    createdBy,
  });

  return mapObservation(observation);
}

async function getObservationById(observationId) {
  const validObservationId = validateObservationId(observationId);

  const observation = await findObservationById(validObservationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  return mapObservation(observation);
}

async function getObservations() {
  const observations = await findObservations();

  return observations.map(mapObservation);
}

async function updateObservation(observationId, data, actorUserId, actorRole) {
  const validObservationId = validateObservationId(observationId);

  const validatedUpdates = validateUpdateObservationInput(data);

  const observation = await findObservationById(validObservationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  if (observation.status !== "NEW") {
    const error = new Error(
      "Observation details can only be edited while the observation is NEW",
    );
    error.statusCode = 409;
    throw error;
  }

  if (observation.created_by !== actorUserId && actorRole !== "ADMIN") {
    const error = new Error(
      "Only the observation creator can edit this report",
    );
    error.statusCode = 403;
    throw error;
  }

  const nextCageId = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "cageId",
  )
    ? validatedUpdates.cageId
    : observation.cage_id;

  const nextAnimalId = Object.prototype.hasOwnProperty.call(
    validatedUpdates,
    "animalId",
  )
    ? validatedUpdates.animalId
    : observation.animal_id;

  const contextChanged =
    Object.prototype.hasOwnProperty.call(validatedUpdates, "cageId") ||
    Object.prototype.hasOwnProperty.call(validatedUpdates, "animalId");

  if (contextChanged) {
    await validateObservationContext(nextCageId, nextAnimalId);
  }
  const updated = await updateObservationDetails(
    validObservationId,
    validatedUpdates,
    actorUserId,
  );

  if (!updated) {
    const error = new Error("Observation is no longer available for editing");
    error.statusCode = 409;
    throw error;
  }

  return mapObservation(updated);
}

async function claimObservationWorkflow(observationId, actorUserId) {
  const validObservationId = validateObservationId(observationId);

  const observation = await findObservationById(validObservationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  if (observation.status !== "NEW") {
    const error = new Error("Only NEW observations can be claimed");
    error.statusCode = 409;
    throw error;
  }

  const claimed = await claimObservation(validObservationId, actorUserId);

  if (!claimed) {
    const error = new Error("Observation has already been claimed");
    error.statusCode = 409;
    throw error;
  }

  return mapObservation(claimed);
}

function ensureHandler(observation, actorUserId) {
  if (observation.handled_by !== actorUserId) {
    const error = new Error(
      "Only the assigned handler can update this observation",
    );
    error.statusCode = 403;
    throw error;
  }
}

function ensureNotTerminal(observation) {
  if (
    observation.status === "RESOLVED" ||
    observation.status === "ESCALATED_TO_MEDICAL"
  ) {
    const error = new Error("This observation can no longer be modified");
    error.statusCode = 409;
    throw error;
  }
}

async function monitorObservation(observationId, actorUserId) {
  const validObservationId = validateObservationId(observationId);

  const observation = await findObservationById(validObservationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  ensureNotTerminal(observation);

  if (observation.status !== "BEING_HANDLED") {
    const error = new Error(
      "Only observations being handled can be moved to monitoring",
    );
    error.statusCode = 409;
    throw error;
  }

  ensureHandler(observation, actorUserId);

  const updated = await updateObservationStatus(
    validObservationId,
    "MONITORING",
    actorUserId,
    ["BEING_HANDLED"],
  );

  if (!updated) {
    const error = new Error(
      "Observation state changed before the update could be completed",
    );
    error.statusCode = 409;
    throw error;
  }

  return mapObservation(updated);
}

async function resolveObservation(observationId, actorUserId) {
  const validObservationId = validateObservationId(observationId);

  const observation = await findObservationById(validObservationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  ensureNotTerminal(observation);

  if (!["BEING_HANDLED", "MONITORING"].includes(observation.status)) {
    const error = new Error(
      "Observation cannot be resolved from its current status",
    );
    error.statusCode = 409;
    throw error;
  }
  ensureHandler(observation, actorUserId);

  const updated = await updateObservationStatus(
    validObservationId,
    "RESOLVED",
    actorUserId,
    ["BEING_HANDLED", "MONITORING"],
  );

  if (!updated) {
    const error = new Error(
      "Observation state changed before the update could be completed",
    );
    error.statusCode = 409;
    throw error;
  }

  return mapObservation(updated);
}

async function escalateObservation(observationId, actorUserId) {
  const validObservationId = validateObservationId(observationId);

  const observation = await findObservationById(validObservationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  ensureNotTerminal(observation);

  if (!["BEING_HANDLED", "MONITORING"].includes(observation.status)) {
    const error = new Error(
      "Observation cannot be escalated from its current status",
    );
    error.statusCode = 409;
    throw error;
  }

  ensureHandler(observation, actorUserId);

  const updated = await updateObservationStatus(
    validObservationId,
    "ESCALATED_TO_MEDICAL",
    actorUserId,
    ["BEING_HANDLED", "MONITORING"],
  );

  if (!updated) {
    const error = new Error(
      "Observation state changed before the update could be completed",
    );
    error.statusCode = 409;
    throw error;
  }

  return mapObservation(updated);
}

async function takeOverObservationWorkflow(observationId, adminUserId) {
  const validObservationId = validateObservationId(observationId);

  const observation = await findObservationById(validObservationId);

  if (!observation) {
    const error = new Error("Observation not found");
    error.statusCode = 404;
    throw error;
  }

  ensureNotTerminal(observation);

  if (observation.status === "NEW") {
    const error = new Error(
      "NEW observations should be claimed instead of taken over",
    );
    error.statusCode = 409;
    throw error;
  }

  if (observation.handled_by === adminUserId) {
    const error = new Error("You are already the assigned handler");
    error.statusCode = 409;
    throw error;
  }

  const updated = await takeOverObservation(validObservationId, adminUserId);

  if (!updated) {
    const error = new Error("Observation is not available for takeover");
    error.statusCode = 409;
    throw error;
  }

  return mapObservation(updated);
}

export {
  createObservation,
  getObservationById,
  getObservations,
  updateObservation,
  claimObservationWorkflow,
  monitorObservation,
  resolveObservation,
  escalateObservation,
  takeOverObservationWorkflow,
};

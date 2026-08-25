import pool from "../../config/db.js";

import {
  findActiveAssignmentByAnimalId,
  findAssignmentById,
  countActiveAssignmentsByCageId,
  insertCageAssignment,
  closeCageAssignment,
  findCurrentAssignments,
  findAssignmentsByCageId,
  findAnimalCageHistory,
} from "./cageAssignment.repository.js";

import { findAnimalById } from "../animals/animal.repository.js";
import { findCageById } from "../cages/cage.repository.js";

import {
  validateAssignmentId,
  validateAnimalId,
  validateCageId,
  validateCreateAssignmentInput,
  validateMoveAnimalInput,
} from "./cageAssignment.validation.js";

function mapAssignment(assignment) {
  if (!assignment) return null;

  return {
    assignmentId: assignment.assignment_id,
    animalId: assignment.animal_id,
    cageId: assignment.cage_id,
    assignedAt: assignment.assigned_at,
    assignedBy: assignment.assigned_by,
    removedAt: assignment.removed_at,
    removedBy: assignment.removed_by,
    reason: assignment.reason,
  };
}

function mapAssignmentView(row) {
  return {
    assignmentId: row.assignment_id,

    animalId: row.animal_id,
    animalCode: row.animal_code,
    animalName: row.animal_name,
    species: row.species,
    sex: row.sex,

    cageId: row.cage_id,
    cageCode: row.cage_code,
    speciesGroup: row.species_group,
    genderGroup: row.gender_group,
    recommendedCapacity: row.recommended_capacity,

    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
    removedAt: row.removed_at,
    removedBy: row.removed_by,
    reason: row.reason,
  };
}

async function validatePlacement(animalId, cageId, db = pool) {
  const animal = await findAnimalById(animalId, db);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  if (animal.status !== "ACTIVE") {
    const error = new Error("Only ACTIVE animals can be assigned to a cage");
    error.statusCode = 409;
    throw error;
  }

  const cage = await findCageById(cageId, db);

  if (!cage) {
    const error = new Error("Cage not found");
    error.statusCode = 404;
    throw error;
  }

  if (cage.status !== "ACTIVE") {
    const error = new Error("Animals can only be assigned to ACTIVE cages");
    error.statusCode = 409;
    throw error;
  }

  if (animal.species !== cage.species_group) {
    const error = new Error(
      "Animal species does not match the cage species group",
    );
    error.statusCode = 409;
    throw error;
  }

  const occupancy = await countActiveAssignmentsByCageId(cageId, db);

  const warnings = [];

  if (occupancy >= cage.recommended_capacity) {
    warnings.push("Cage is at or above its recommended capacity");
  }

  if (cage.gender_group !== "MIXED" && animal.sex !== cage.gender_group) {
    warnings.push("Animal sex does not match the cage gender group");
  }

  return {
    animal,
    cage,
    occupancy,
    warnings,
  };
}

async function createCageAssignment(assignmentData, assignedBy) {
  const validatedData = validateCreateAssignmentInput(assignmentData);

  const { animalId, cageId, reason } = validatedData;

  const existingAssignment = await findActiveAssignmentByAnimalId(animalId);

  if (existingAssignment) {
    const error = new Error("Animal already has an active cage assignment");
    error.statusCode = 409;
    throw error;
  }

  const { warnings } = await validatePlacement(animalId, cageId);

  try {
    const assignment = await insertCageAssignment({
      animalId,
      cageId,
      assignedBy,
      reason,
    });

    return {
      assignment: mapAssignment(assignment),
      warnings,
    };
  } catch (error) {
    if (
      error.code === "23505" &&
      error.constraint === "uq_cage_assignments_active_animal"
    ) {
      const conflictError = new Error(
        "Animal already has an active cage assignment",
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  }
}

async function getCurrentAssignments() {
  const assignments = await findCurrentAssignments();

  return assignments.map(mapAssignmentView);
}

async function getCageAssignmentHistory(cageId) {
  const validCageId = validateCageId(cageId);

  const cage = await findCageById(validCageId);

  if (!cage) {
    const error = new Error("Cage not found");
    error.statusCode = 404;
    throw error;
  }

  const assignments = await findAssignmentsByCageId(validCageId);

  return assignments.map(mapAssignmentView);
}

async function getAnimalCageHistory(animalId) {
  const validAnimalId = validateAnimalId(animalId);

  const animal = await findAnimalById(validAnimalId);

  if (!animal) {
    const error = new Error("Animal not found");
    error.statusCode = 404;
    throw error;
  }

  const assignments = await findAnimalCageHistory(validAnimalId);

  return assignments.map(mapAssignmentView);
}

async function removeCageAssignment(assignmentId, removedBy) {
  const validAssignmentId = validateAssignmentId(assignmentId);

  const existingAssignment = await findAssignmentById(validAssignmentId);

  if (!existingAssignment) {
    const error = new Error("Cage assignment not found");
    error.statusCode = 404;
    throw error;
  }

  if (existingAssignment.removed_at) {
    const error = new Error("Cage assignment is already closed");
    error.statusCode = 409;
    throw error;
  }

  const closedAssignment = await closeCageAssignment(
    validAssignmentId,
    removedBy,
  );

  if (!closedAssignment) {
    const error = new Error("Cage assignment is already closed");
    error.statusCode = 409;
    throw error;
  }

  return mapAssignment(closedAssignment);
}

async function moveAnimal(animalId, moveData, movedBy) {
  const validAnimalId = validateAnimalId(animalId);

  const validatedMove = validateMoveAnimalInput(moveData);

  const { cageId: destinationCageId, reason } = validatedMove;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentAssignment = await findActiveAssignmentByAnimalId(
      validAnimalId,
      client,
    );

    if (!currentAssignment) {
      const error = new Error("Animal does not have an active cage assignment");
      error.statusCode = 409;
      throw error;
    }

    if (currentAssignment.cage_id === destinationCageId) {
      const error = new Error("Animal is already assigned to this cage");
      error.statusCode = 409;
      throw error;
    }

    const { warnings } = await validatePlacement(
      validAnimalId,
      destinationCageId,
      client,
    );

    const closedAssignment = await closeCageAssignment(
      currentAssignment.assignment_id,
      movedBy,
      client,
    );

    if (!closedAssignment) {
      const error = new Error("Current cage assignment could not be closed");
      error.statusCode = 409;
      throw error;
    }

    const newAssignment = await insertCageAssignment(
      {
        animalId: validAnimalId,
        cageId: destinationCageId,
        assignedBy: movedBy,
        reason,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      previousAssignment: mapAssignment(closedAssignment),

      assignment: mapAssignment(newAssignment),

      warnings,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export {
  createCageAssignment,
  getCurrentAssignments,
  getCageAssignmentHistory,
  getAnimalCageHistory,
  removeCageAssignment,
  moveAnimal,
};

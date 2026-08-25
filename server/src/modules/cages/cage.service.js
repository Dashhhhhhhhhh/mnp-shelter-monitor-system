import {
  getNextCageCodeNumber,
  insertCage,
  findCages,
  findCageById,
  updateCageRecord,
  findCageByIdempotencyKey
} from "./cage.repository.js";

import {
  validateCageId,
  validateCreateCageInput,
  validateUpdateCageInput,
} from "./cage.validation.js";

import crypto from "crypto";

function validateIdempotencyKey(idempotencyKey) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof idempotencyKey !== "string" || !uuidPattern.test(idempotencyKey)) {
    const error = new Error("A valid Idempotency-Key header is required");
    error.statusCode = 400;
    throw error;
  }

  return idempotencyKey;
}

function createCageRequestHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function mapCage(cage) {
  if (!cage) return null;

  return {
    cageId: cage.cage_id,
    cageCode: cage.cage_code,
    speciesGroup: cage.species_group,
    genderGroup: cage.gender_group,
    recommendedCapacity: cage.recommended_capacity,
    cageType: cage.cage_type,
    status: cage.status,
    location: cage.location,
    createdBy: cage.created_by,
    updatedBy: cage.updated_by,
    createdAt: cage.created_at,
    updatedAt: cage.updated_at,
  };
}

async function generateCageCode(speciesGroup) {
  const nextNumber = await getNextCageCodeNumber(speciesGroup);

  const paddedNumber = String(nextNumber).padStart(2, "0");

  return `${speciesGroup}-${paddedNumber}`;
}

async function createCage(cageData, createdBy, idempotencyKey) {
  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validatedData = validateCreateCageInput(cageData);

  const idempotencyRequestHash = createCageRequestHash({
    speciesGroup: validatedData.speciesGroup,
    genderGroup: validatedData.genderGroup,
    recommendedCapacity: validatedData.recommendedCapacity,
    cageType: validatedData.cageType,
    status: validatedData.status,
    location: validatedData.location,
  });

  const existingCage = await findCageByIdempotencyKey(
    createdBy,
    validIdempotencyKey,
  );

  if (existingCage) {
    if (existingCage.idempotency_request_hash !== idempotencyRequestHash) {
      const error = new Error(
        "Idempotency key has already been used for a different cage request",
      );
      error.statusCode = 409;
      throw error;
    }

    return {
      cage: mapCage(existingCage),
      isReplay: true,
    };
  }

  try {
    const cageCode = await generateCageCode(validatedData.speciesGroup);

    const createdCage = await insertCage(
      {
        ...validatedData,
        cageCode,
        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,
      },
      createdBy,
    );

    return {
      cage: mapCage(createdCage),
      isReplay: false,
    };
  } catch (error) {
    if (
      error.code === "23505" &&
      error.constraint === "uq_cages_created_by_idempotency_key"
    ) {
      const concurrentExistingCage = await findCageByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
      );

      if (
        !concurrentExistingCage ||
        concurrentExistingCage.idempotency_request_hash !==
          idempotencyRequestHash
      ) {
        const conflictError = new Error(
          "Idempotency key has already been used for a different cage request",
        );
        conflictError.statusCode = 409;
        throw conflictError;
      }

      return {
        cage: mapCage(concurrentExistingCage),
        isReplay: true,
      };
    }

    throw error;
  }
}

async function getCages() {
  const cages = await findCages();

  return cages.map(mapCage);
}

async function getCageById(cageId) {
  const validCageId = validateCageId(cageId);

  const cage = await findCageById(validCageId);

  if (!cage) {
    const error = new Error("Cage not found");
    error.statusCode = 404;
    throw error;
  }

  return mapCage(cage);
}

async function updateCage(cageId, cageData, updatedBy) {
  const validCageId = validateCageId(cageId);

  const updates = validateUpdateCageInput(cageData);

  const existingCage = await findCageById(validCageId);

  if (!existingCage) {
    const error = new Error("Cage not found");
    error.statusCode = 404;
    throw error;
  }

  const updatedCage = await updateCageRecord(validCageId, updates, updatedBy);

  return mapCage(updatedCage);
}

export { createCage, getCages, getCageById, updateCage };

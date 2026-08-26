import pool from "../../config/db.js";

import {
  findCareRecordById,
  findScheduledCareRecord,
  insertCareRecord,
  completeCareRecord,
  insertCareRecordParticipants,
  findCareRecordParticipants,
  findCareRecordsByDate,
  findCareRecordsByCageId,
  findUsersByIds,
} from "./careRecord.repository.js";

import {
  validateCareRecordId,
  validateCageId,
  validateCareDate,
  validateCreateCareRecordInput,
} from "./careRecord.validation.js";

import { findCageById } from "../cages/cage.repository.js";

const ALLOWED_PARTICIPANT_ROLES = ["ADMIN", "VOLUNTEER", "CARETAKER"];

function mapCareRecord(record) {
  return {
    careRecordId: record.care_record_id,
    cageId: record.cage_id,

    cageCode: record.cage_code ?? undefined,

    speciesGroup: record.species_group ?? undefined,

    genderGroup: record.gender_group ?? undefined,

    careDate: record.care_date,
    carePeriod: record.care_period,
    careType: record.care_type,
    cleaningType: record.cleaning_type,

    status: record.status,

    isOverdue: isCareRecordOverdue(record),

    completedBy: record.completed_by,
    completedAt: record.completed_at,

    notes: record.notes,

    createdBy: record.created_by,
    updatedBy: record.updated_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
function mapParticipant(participant) {
  return {
    careRecordParticipantId: participant.care_record_participant_id,

    careRecordId: participant.care_record_id,

    userId: participant.user_id,

    firstName: participant.first_name,

    middleInitial: participant.middle_initial,

    lastName: participant.last_name,

    roleId: participant.role_id,

    createdAt: participant.created_at,
  };
}

async function validateCareForCage(cageId, careType, cleaningType, db = pool) {
  const cage = await findCageById(cageId, db);

  if (!cage) {
    const error = new Error("Cage not found");
    error.statusCode = 404;
    throw error;
  }

  if (cage.status !== "ACTIVE") {
    const error = new Error(
      "Care records can only be created for active cages",
    );
    error.statusCode = 409;
    throw error;
  }

  if (careType === "RELIEF_BREAK" && cage.species_group !== "DOG") {
    const error = new Error(
      "Relief break care is only applicable to dog cages",
    );
    error.statusCode = 409;
    throw error;
  }

  if (
    careType === "CLEANING" &&
    cleaningType === "LITTER_BOX" &&
    cage.species_group !== "CAT"
  ) {
    const error = new Error(
      "Litter box cleaning is only applicable to cat cages",
    );
    error.statusCode = 409;
    throw error;
  }

  return cage;
}

async function createCareRecord(data, createdBy) {
  const validated = validateCreateCareRecordInput(data);

  await validateCareForCage(
    validated.cageId,
    validated.careType,
    validated.cleaningType,
  );

  if (validated.carePeriod === "AM" || validated.carePeriod === "PM") {
    const existing = await findScheduledCareRecord(validated);

    if (existing) {
      const error = new Error("This scheduled care task already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  try {
    const record = await insertCareRecord({
      ...validated,
      createdBy,
    });

    return mapCareRecord(record);
  } catch (error) {
    if (
      error.code === "23505" &&
      error.constraint === "uq_care_records_scheduled_task"
    ) {
      const conflict = new Error("This scheduled care task already exists");

      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
}

async function validateParticipants(participantUserIds, db = pool) {
  const users = await findUsersByIds(participantUserIds, db);

  if (users.length !== participantUserIds.length) {
    const error = new Error("One or more care participants do not exist");
    error.statusCode = 400;
    throw error;
  }

  for (const user of users) {
    if (!user.is_active) {
      const error = new Error(
        "Inactive users cannot be recorded as care participants",
      );
      error.statusCode = 409;
      throw error;
    }

    if (!ALLOWED_PARTICIPANT_ROLES.includes(user.role_name)) {
      const error = new Error(
        "Only shelter staff can be recorded as care participants",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  return users;
}

async function completeCare(careRecordId, completionData, completedBy) {
  const validCareRecordId = validateCareRecordId(careRecordId);

  const validatedCompletion = validateCompleteCareRecordInput(completionData);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const careRecord = await findCareRecordById(validCareRecordId, client);

    if (!careRecord) {
      const error = new Error("Care record not found");
      error.statusCode = 404;
      throw error;
    }

    if (careRecord.status === "COMPLETED") {
      const error = new Error("Care record is already completed");
      error.statusCode = 409;
      throw error;
    }

    const now = getManilaDateTime();

    if (careRecord.care_date > now.date) {
      const error = new Error("Future care records cannot be completed");
      error.statusCode = 409;
      throw error;
    }

    await validateParticipants(validatedCompletion.participantUserIds, client);

    const notesProvided = Object.prototype.hasOwnProperty.call(
      completionData,
      "notes",
    );

    const completedRecord = await completeCareRecord(
      validCareRecordId,
      {
        completedBy,
        notes: validatedCompletion.notes,
        notesProvided,
      },
      client,
    );

    if (!completedRecord) {
      const error = new Error("Care record is already completed");
      error.statusCode = 409;
      throw error;
    }

    await insertCareRecordParticipants(
      validCareRecordId,
      validatedCompletion.participantUserIds,
      client,
    );

    const participants = await findCareRecordParticipants(
      validCareRecordId,
      client,
    );

    await client.query("COMMIT");

    return {
      careRecord: mapCareRecord(completedRecord),

      participants: participants.map(mapParticipant),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getCareRecordsForCage(cageId) {
  const validCageId = validateCageId(cageId);

  const cage = await findCageById(validCageId);

  if (!cage) {
    const error = new Error("Cage not found");
    error.statusCode = 404;
    throw error;
  }

  const records = await findCareRecordsByCageId(validCageId);

  return records.map(mapCareRecord);
}

function getManilaDateTime() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

function isCareRecordOverdue(record) {
  if (record.status !== "PENDING") {
    return false;
  }

  if (record.care_period === "EXTRA") {
    return false;
  }

  const now = getManilaDateTime();

  if (record.care_date < now.date) {
    return true;
  }

  if (record.care_date > now.date) {
    return false;
  }

  if (record.care_period === "AM" && now.hour >= 12) {
    return true;
  }

  return false;
}

async function getCareRecordsByDate(careDate) {
  const validCareDate = validateCareDate(careDate);

  const records = await findCareRecordsByDate(validCareDate);

  return records.map(mapCareRecord);
}

export {
  createCareRecord,
  completeCare,
  getCareRecordsByDate,
  getCareRecordsForCage,
};

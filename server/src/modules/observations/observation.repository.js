import pool from "../../config/db.js";

async function findObservationById(observationId, db = pool) {
  const result = await db.query(
    `
      SELECT
        o.observation_id,
        o.cage_id,
        c.cage_code,
        c.species_group,
        o.animal_id,
        a.animal_code,
        a.animal_name,
        o.observation_type,
        o.urgency,
        o.status,
        o.notes,
        o.photo,
        o.created_by,
        o.handled_by,
        o.updated_by,
        o.created_at,
        o.updated_at,
        o.resolved_at
      FROM observations o
      JOIN cages c
        ON c.cage_id = o.cage_id
      LEFT JOIN animals a
        ON a.animal_id = o.animal_id
      WHERE o.observation_id = $1
    `,
    [observationId],
  );

  return result.rows[0] || null;
}

async function insertObservation(
  { cageId, animalId, observationType, urgency, notes, photo, createdBy },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO observations (
        cage_id,
        animal_id,
        observation_type,
        urgency,
        notes,
        photo,
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
        $7
      )
      RETURNING
        observation_id,
        cage_id,
        animal_id,
        observation_type,
        urgency,
        status,
        notes,
        photo,
        created_by,
        handled_by,
        updated_by,
        created_at,
        updated_at,
        resolved_at
    `,
    [cageId, animalId, observationType, urgency, notes, photo, createdBy],
  );

  return result.rows[0];
}

async function findObservations(db = pool) {
  const result = await db.query(
    `
      SELECT
        o.observation_id,
        o.cage_id,
        c.cage_code,
        c.species_group,
        o.animal_id,
        a.animal_code,
        a.animal_name,
        o.observation_type,
        o.urgency,
        o.status,
        o.notes,
        o.photo,
        o.created_by,
        o.handled_by,
        o.updated_by,
        o.created_at,
        o.updated_at,
        o.resolved_at
      FROM observations o
      JOIN cages c
        ON c.cage_id = o.cage_id
      LEFT JOIN animals a
        ON a.animal_id = o.animal_id
      ORDER BY
        CASE
          WHEN o.status IN ('NEW', 'BEING_HANDLED', 'MONITORING') THEN 1
          ELSE 2
        END,
        CASE o.urgency
          WHEN 'URGENT' THEN 1
          WHEN 'NEEDS_ATTENTION' THEN 2
          WHEN 'NORMAL' THEN 3
        END,
        o.created_at DESC
    `,
  );

  return result.rows;
}

async function updateObservationDetails(
  observationId,
  updates,
  updatedBy,
  db = pool,
) {
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (Object.prototype.hasOwnProperty.call(updates, "cageId")) {
    addField("cage_id", updates.cageId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "animalId")) {
    addField("animal_id", updates.animalId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "observationType")) {
    addField("observation_type", updates.observationType);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "urgency")) {
    addField("urgency", updates.urgency);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "notes")) {
    addField("notes", updates.notes);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "photo")) {
    addField("photo", updates.photo);
  }

  values.push(updatedBy);

  fields.push(`updated_by = $${values.length}`);

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(observationId);

  const observationIdPosition = values.length;

  const result = await db.query(
    `
      UPDATE observations
      SET
        ${fields.join(", ")}
      WHERE observation_id =
        $${observationIdPosition}
        AND status = 'NEW'
      RETURNING
        observation_id,
        cage_id,
        animal_id,
        observation_type,
        urgency,
        status,
        notes,
        photo,
        created_by,
        handled_by,
        updated_by,
        created_at,
        updated_at,
        resolved_at
    `,
    values,
  );

  return result.rows[0] || null;
}

async function claimObservation(observationId, handledBy, db = pool) {
  const result = await db.query(
    `
      UPDATE observations
      SET
        status = 'BEING_HANDLED',
        handled_by = $2,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE observation_id = $1
        AND status = 'NEW'
        AND handled_by IS NULL
      RETURNING
        observation_id,
        cage_id,
        animal_id,
        observation_type,
        urgency,
        status,
        notes,
        photo,
        created_by,
        handled_by,
        updated_by,
        created_at,
        updated_at,
        resolved_at
    `,
    [observationId, handledBy],
  );

  return result.rows[0] || null;
}

async function updateObservationStatus(
  observationId,
  status,
  updatedBy,
  allowedCurrentStatuses,
  db = pool,
) {
  const result = await db.query(
    `
      UPDATE observations
      SET
        status = $2::varchar,

        resolved_at = CASE
          WHEN $2::varchar = 'RESOLVED'
            THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,

        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE observation_id = $1
        AND handled_by = $3
        AND status = ANY($4::varchar[])
      RETURNING
        observation_id,
        cage_id,
        animal_id,
        observation_type,
        urgency,
        status,
        notes,
        photo,
        created_by,
        handled_by,
        updated_by,
        created_at,
        updated_at,
        resolved_at
    `,
    [observationId, status, updatedBy, allowedCurrentStatuses],
  );

  return result.rows[0] || null;
}
async function takeOverObservation(observationId, adminUserId, db = pool) {
  const result = await db.query(
    `
      UPDATE observations
      SET
        handled_by = $2,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE observation_id = $1
        AND status IN (
          'BEING_HANDLED',
          'MONITORING'
        )
      RETURNING
        observation_id,
        cage_id,
        animal_id,
        observation_type,
        urgency,
        status,
        notes,
        photo,
        created_by,
        handled_by,
        updated_by,
        created_at,
        updated_at,
        resolved_at
    `,
    [observationId, adminUserId],
  );

  return result.rows[0] || null;
}

export {
  findObservationById,
  insertObservation,
  findObservations,
  updateObservationDetails,
  claimObservation,
  updateObservationStatus,
  takeOverObservation,
};

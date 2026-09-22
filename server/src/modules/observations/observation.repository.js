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

async function findObservations(
  {
    search,
    view,
    status,
    urgency,
    observationType,
    handledBy,
    attention,
    page,
    limit,
    sortBy,
    sortOrder,
  },
  db = pool,
) {
  const conditions = [];
  const values = [];

  if (handledBy) {
    values.push(handledBy);
    conditions.push(`o.handled_by = $${values.length}`);

    if (attention) {
      values.push(["URGENT", "NEEDS_ATTENTION"]);

      conditions.push(`o.urgency = ANY($${values.length}::varchar[])`);
    }
  }

  if (view === "active") {
    values.push(["NEW", "BEING_HANDLED", "MONITORING"]);

    conditions.push(`o.status = ANY($${values.length}::varchar[])`);
  }

  if (view === "history") {
    values.push(["RESOLVED", "ESCALATED_TO_MEDICAL"]);

    conditions.push(`o.status = ANY($${values.length}::varchar[])`);
  }

  if (search) {
    values.push(`%${search}%`);

    conditions.push(`
    (
      a.animal_name ILIKE $${values.length}
      OR a.animal_code ILIKE $${values.length}
      OR c.cage_code ILIKE $${values.length}
      OR o.notes ILIKE $${values.length}
    )
  `);
  }

  if (status) {
    values.push(status);

    conditions.push(`o.status = $${values.length}`);
  }

  if (urgency) {
    values.push(urgency);

    conditions.push(`o.urgency = $${values.length}`);
  }

  if (observationType) {
    values.push(observationType);

    conditions.push(`o.observation_type = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.query(
    `
    SELECT COUNT(*)::int AS total
    FROM observations o
    JOIN cages c
      ON c.cage_id = o.cage_id
    LEFT JOIN animals a
      ON a.animal_id = o.animal_id
    ${whereClause}
  `,
    values,
  );

  const totalItems = countResult.rows[0].total;

  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];

  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;

  const sortColumns = {
    createdAt: "o.created_at",
    updatedAt: "o.updated_at",
    observationType: "o.observation_type",
  };

  let orderByClause;

  if (sortBy === "priority") {
    orderByClause = `
    CASE o.urgency
      WHEN 'URGENT' THEN 1
      WHEN 'NEEDS_ATTENTION' THEN 2
      WHEN 'NORMAL' THEN 3
    END ASC,
    CASE o.status
      WHEN 'NEW' THEN 1
      WHEN 'BEING_HANDLED' THEN 2
      WHEN 'MONITORING' THEN 3
      ELSE 4
    END ASC,
    o.created_at DESC
  `;
  } else {
    const sortColumn = sortColumns[sortBy] || "o.created_at";

    const order = sortOrder === "asc" ? "ASC" : "DESC";

    orderByClause = `
    ${sortColumn} ${order},
    o.created_at DESC
  `;
  }

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
      ${whereClause}
        ORDER BY ${orderByClause}
      LIMIT $${limitPosition}
      OFFSET $${offsetPosition}
    `,
    dataValues,
  );

  return {
    observations: result.rows,
    totalItems,
  };
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

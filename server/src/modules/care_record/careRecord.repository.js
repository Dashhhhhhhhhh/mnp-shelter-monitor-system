import pool from "../../config/db.js";

async function findCareRecordById(careRecordId, db = pool) {
  const result = await db.query(
    `
      SELECT
        care_record_id,
        cage_id,
        care_date::text AS care_date,
        care_period,
        care_type,
        cleaning_type,
        status,
        completed_by,
        completed_at,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM care_records
      WHERE care_record_id = $1
    `,
    [careRecordId],
  );

  return result.rows[0] || null;
}

async function findScheduledCareRecord(
  { cageId, careDate, carePeriod, careType, cleaningType },
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        care_record_id,
        cage_id,
        care_date::text AS care_date, 
        care_period,
        care_type,
        cleaning_type,
        status,
        completed_by,
        completed_at,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM care_records
      WHERE cage_id = $1
        AND care_date = $2
        AND care_period = $3
        AND care_type = $4
        AND COALESCE(cleaning_type, '') =
            COALESCE($5::varchar, '')
      LIMIT 1
    `,
    [cageId, careDate, carePeriod, careType, cleaningType],
  );

  return result.rows[0] || null;
}

async function insertCareRecord(
  { cageId, careDate, carePeriod, careType, cleaningType, notes, createdBy },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO care_records (
        cage_id,
        care_date,
        care_period,
        care_type,
        cleaning_type,
        notes,
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
        care_record_id,
        cage_id,
        care_date::text AS care_date,
        care_period,
        care_type,
        cleaning_type,
        status,
        completed_by,
        completed_at,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [cageId, careDate, carePeriod, careType, cleaningType, notes, createdBy],
  );

  return result.rows[0];
}

async function completeCareRecord(
  careRecordId,
  { completedBy, notes, notesProvided },
  db = pool,
) {
  const result = await db.query(
    `
      UPDATE care_records
      SET
        status = 'COMPLETED',
        completed_by = $2,
        completed_at = CURRENT_TIMESTAMP,
        notes = CASE
          WHEN $3 = true THEN $4
          ELSE notes
        END,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE care_record_id = $1
        AND status = 'PENDING'
      RETURNING
        care_record_id,
        cage_id,
        care_date::text AS care_date,
        care_period,
        care_type,
        cleaning_type,
        status,
        completed_by,
        completed_at,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [careRecordId, completedBy, notesProvided, notes],
  );

  return result.rows[0] || null;
}

async function insertCareRecordParticipants(
  careRecordId,
  participantUserIds,
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO care_record_participants (
        care_record_id,
        user_id
      )
      SELECT
        $1,
        participant_user_id
      FROM unnest($2::uuid[]) AS participant_user_id
      RETURNING
        care_record_participant_id,
        care_record_id,
        user_id,
        created_at
    `,
    [careRecordId, participantUserIds],
  );

  return result.rows;
}

async function findCareRecordParticipants(careRecordId, db = pool) {
  const result = await db.query(
    `
      SELECT
        crp.care_record_participant_id,
        crp.care_record_id,
        crp.user_id,
        u.first_name,
        u.middle_initial,
        u.last_name,
        u.role_id,
        crp.created_at
      FROM care_record_participants crp
      JOIN users u
        ON u.user_id = crp.user_id
      WHERE crp.care_record_id = $1
      ORDER BY
        u.last_name ASC,
        u.first_name ASC
    `,
    [careRecordId],
  );

  return result.rows;
}

async function findCareRecordsByDate(careDate, db = pool) {
  const result = await db.query(
    `
      SELECT
        cr.care_record_id,
        cr.cage_id,
        c.cage_code,
        c.species_group,
        c.gender_group,
        cr.care_date::text AS care_date,
        cr.care_period,
        cr.care_type,
        cr.cleaning_type,
        cr.status,
        cr.completed_by,
        cr.completed_at,
        cr.notes,
        cr.created_by,
        cr.updated_by,
        cr.created_at,
        cr.updated_at
      FROM care_records cr
      JOIN cages c
        ON c.cage_id = cr.cage_id
      WHERE cr.care_date = $1
      ORDER BY
        CASE cr.care_period
          WHEN 'AM' THEN 1
          WHEN 'PM' THEN 2
          WHEN 'EXTRA' THEN 3
        END,
        c.cage_code ASC,
        cr.care_type ASC,
        cr.cleaning_type ASC NULLS FIRST
    `,
    [careDate],
  );

  return result.rows;
}

async function findCareRecordsByCageId(cageId, db = pool) {
  const result = await db.query(
    `
      SELECT
        cr.care_record_id,
        cr.cage_id,
        c.cage_code,
        c.species_group,
        c.gender_group,
        cr.care_date::text AS care_date,
        cr.care_period,
        cr.care_type,
        cr.cleaning_type,
        cr.status,
        cr.completed_by,
        cr.completed_at,
        cr.notes,
        cr.created_by,
        cr.updated_by,
        cr.created_at,
        cr.updated_at
      FROM care_records cr
      JOIN cages c
        ON c.cage_id = cr.cage_id
      WHERE cr.cage_id = $1
      ORDER BY
        cr.care_date DESC,
        CASE cr.care_period
          WHEN 'AM' THEN 1
          WHEN 'PM' THEN 2
          WHEN 'EXTRA' THEN 3
        END,
        cr.created_at DESC
    `,
    [cageId],
  );

  return result.rows;
}

async function findUsersByIds(userIds, db = pool) {
  const result = await db.query(
    `
      SELECT
        u.user_id,
        u.first_name,
        u.middle_initial,
        u.last_name,
        u.is_active,
        r.role_name
      FROM users u
      JOIN roles r
        ON r.role_id = u.role_id
      WHERE u.user_id = ANY($1::uuid[])
    `,
    [userIds],
  );

  return result.rows;
}

export {
  findCareRecordById,
  findScheduledCareRecord,
  insertCareRecord,
  completeCareRecord,
  insertCareRecordParticipants,
  findCareRecordParticipants,
  findCareRecordsByDate,
  findCareRecordsByCageId,
  findUsersByIds,
};

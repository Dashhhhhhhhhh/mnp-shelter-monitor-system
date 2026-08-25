import pool from "../../config/db.js";

async function findActiveAssignmentByAnimalId(animalId, db = pool) {
  const result = await db.query(
    `SELECT
      assignment_id,
      animal_id,
      cage_id,
      assigned_at,
      assigned_by,
      removed_at,
      removed_by,
      reason
    FROM cage_assignments
    WHERE animal_id = $1
      AND removed_at IS NULL`,
    [animalId],
  );

  return result.rows[0];
}

async function findAssignmentById(assignmentId, db = pool) {
  const result = await db.query(
    `SELECT
      assignment_id,
      animal_id,
      cage_id,
      assigned_at,
      assigned_by,
      removed_at,
      removed_by,
      reason
    FROM cage_assignments
    WHERE assignment_id = $1`,
    [assignmentId],
  );

  return result.rows[0];
}

async function countActiveAssignmentsByCageId(cageId, db = pool) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS occupancy
    FROM cage_assignments
    WHERE cage_id = $1
      AND removed_at IS NULL`,
    [cageId],
  );

  return result.rows[0].occupancy;
}

async function insertCageAssignment(assignmentData, db = pool) {
  const { animalId, cageId, assignedBy, reason } = assignmentData;

  const result = await db.query(
    `INSERT INTO cage_assignments (
      animal_id,
      cage_id,
      assigned_by,
      reason
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      assignment_id,
      animal_id,
      cage_id,
      assigned_at,
      assigned_by,
      removed_at,
      removed_by,
      reason`,
    [animalId, cageId, assignedBy, reason],
  );

  return result.rows[0];
}

async function closeCageAssignment(assignmentId, removedBy, db = pool) {
  const result = await db.query(
    `UPDATE cage_assignments
    SET
      removed_at = CURRENT_TIMESTAMP,
      removed_by = $2
    WHERE assignment_id = $1
      AND removed_at IS NULL
    RETURNING
      assignment_id,
      animal_id,
      cage_id,
      assigned_at,
      assigned_by,
      removed_at,
      removed_by,
      reason`,
    [assignmentId, removedBy],
  );

  return result.rows[0];
}

async function findCurrentAssignments() {
  const result = await pool.query(
    `SELECT
      ca.assignment_id,
      ca.animal_id,
      a.animal_code,
      a.animal_name,
      a.species,
      a.sex,
      ca.cage_id,
      c.cage_code,
      c.species_group,
      c.gender_group,
      c.recommended_capacity,
      ca.assigned_at,
      ca.assigned_by,
      ca.reason
    FROM cage_assignments ca
    JOIN animals a
      ON ca.animal_id = a.animal_id
    JOIN cages c
      ON ca.cage_id = c.cage_id
    WHERE ca.removed_at IS NULL
    ORDER BY c.cage_code ASC, ca.assigned_at ASC`,
  );

  return result.rows;
}

async function findAssignmentsByCageId(cageId) {
  const result = await pool.query(
    `SELECT
      ca.assignment_id,
      ca.animal_id,
      a.animal_code,
      a.animal_name,
      a.species,
      a.sex,
      ca.cage_id,
      c.cage_code,
      ca.assigned_at,
      ca.assigned_by,
      ca.removed_at,
      ca.removed_by,
      ca.reason
    FROM cage_assignments ca
    JOIN animals a
      ON ca.animal_id = a.animal_id
    JOIN cages c
      ON ca.cage_id = c.cage_id
    WHERE ca.cage_id = $1
    ORDER BY ca.assigned_at DESC`,
    [cageId],
  );

  return result.rows;
}

async function findAnimalCageHistory(animalId) {
  const result = await pool.query(
    `SELECT
      ca.assignment_id,
      ca.animal_id,
      a.animal_code,
      a.animal_name,
      ca.cage_id,
      c.cage_code,
      ca.assigned_at,
      ca.assigned_by,
      ca.removed_at,
      ca.removed_by,
      ca.reason
    FROM cage_assignments ca
    JOIN animals a
      ON ca.animal_id = a.animal_id
    JOIN cages c
      ON ca.cage_id = c.cage_id
    WHERE ca.animal_id = $1
    ORDER BY ca.assigned_at DESC`,
    [animalId],
  );

  return result.rows;
}

export {
  findActiveAssignmentByAnimalId,
  findAssignmentById,
  countActiveAssignmentsByCageId,
  insertCageAssignment,
  closeCageAssignment,
  findCurrentAssignments,
  findAssignmentsByCageId,
  findAnimalCageHistory,
};

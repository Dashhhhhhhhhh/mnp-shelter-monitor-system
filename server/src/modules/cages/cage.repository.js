import pool from "../../config/db.js";

async function getNextCageCodeNumber(speciesGroup) {
  const sequenceMap = {
    CAT: "cage_cat_code_seq",
    DOG: "cage_dog_code_seq",
  };

  const sequenceName = sequenceMap[speciesGroup];

  if (!sequenceName) {
    throw new Error("Invalid species group for cage code generation");
  }

  const result = await pool.query(
    "SELECT nextval($1::regclass) AS next_number",
    [sequenceName],
  );

  return Number(result.rows[0].next_number);
}

async function insertCage(cageData, createdBy) {
  const {
    cageCode,
    speciesGroup,
    genderGroup,
    recommendedCapacity,
    cageType,
    status,
    location,
    idempotencyKey,
    idempotencyRequestHash,
  } = cageData;

  const result = await pool.query(
    `INSERT INTO cages (
    cage_code,
    species_group,
    gender_group,
    recommended_capacity,
    cage_type,
    status,
    location,
    created_by,
    updated_by,
    idempotency_key,
    idempotency_request_hash
  )
  VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $8, $9, $10
  )
  RETURNING
    cage_id,
    cage_code,
    species_group,
    gender_group,
    recommended_capacity,
    cage_type,
    status,
    location,
    created_by,
    updated_by,
    created_at,
    updated_at`,
    [
      cageCode,
      speciesGroup,
      genderGroup,
      recommendedCapacity,
      cageType,
      status,
      location,
      createdBy,
      idempotencyKey,
      idempotencyRequestHash,
    ],
  );
  return result.rows[0];
}

async function findCages() {
  const result = await pool.query(
    `SELECT
      cage_id,
      cage_code,
      species_group,
      gender_group,
      recommended_capacity,
      cage_type,
      status,
      location,
      created_by,
      updated_by,
      created_at,
      updated_at
    FROM cages
    ORDER BY cage_code ASC`,
  );

  return result.rows;
}

async function findCageById(cageId, db = pool) {
  const result = await db.query(
    `SELECT
      cage_id,
      cage_code,
      species_group,
      gender_group,
      recommended_capacity,
      cage_type,
      status,
      location,
      created_by,
      updated_by,
      created_at,
      updated_at
    FROM cages
    WHERE cage_id = $1`,
    [cageId],
  );

  return result.rows[0];
}

async function updateCageRecord(cageId, updates, updatedBy) {
  const columnMap = {
    speciesGroup: "species_group",
    genderGroup: "gender_group",
    recommendedCapacity: "recommended_capacity",
    cageType: "cage_type",
    status: "status",
    location: "location",
  };

  const setClauses = [];
  const values = [];
  let parameterIndex = 1;

  for (const [field, value] of Object.entries(updates)) {
    const column = columnMap[field];

    if (!column) {
      continue;
    }

    setClauses.push(`${column} = $${parameterIndex}`);
    values.push(value);
    parameterIndex++;
  }

  setClauses.push(`updated_by = $${parameterIndex}`);
  values.push(updatedBy);
  parameterIndex++;

  setClauses.push("updated_at = CURRENT_TIMESTAMP");

  values.push(cageId);

  const result = await pool.query(
    `UPDATE cages
     SET ${setClauses.join(", ")}
     WHERE cage_id = $${parameterIndex}
     RETURNING
       cage_id,
       cage_code,
       species_group,
       gender_group,
       recommended_capacity,
       cage_type,
       status,
       location,
       created_by,
       updated_by,
       created_at,
       updated_at`,
    values,
  );

  return result.rows[0];
}

async function findCageByIdempotencyKey(createdBy, idempotencyKey) {
  const result = await pool.query(
    `SELECT
      cage_id,
      cage_code,
      species_group,
      gender_group,
      recommended_capacity,
      cage_type,
      status,
      location,
      created_by,
      updated_by,
      created_at,
      updated_at,
      idempotency_request_hash
    FROM cages
    WHERE created_by = $1
      AND idempotency_key = $2`,
    [createdBy, idempotencyKey],
  );

  return result.rows[0];
}

export {
  getNextCageCodeNumber,
  insertCage,
  findCages,
  findCageById,
  updateCageRecord,
  findCageByIdempotencyKey,
};

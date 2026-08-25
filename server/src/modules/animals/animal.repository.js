import pool from "../../config/db.js";

async function getNextAnimalCodeNumber(species) {
  if (species === "CAT") {
    const result = await pool.query(
      `SELECT nextval('animal_cat_code_seq'):: int AS next_number`,
    );

    return result.rows[0].next_number;
  } else if (species === "DOG") {
    const result = await pool.query(
      `SELECT nextval('animal_dog_code_seq'):: int AS next_number`,
    );

    return result.rows[0].next_number;
  } else {
    throw new Error("Unsupported species");
  }
}

async function insertAnimal({
  animalCode,
  animalName,
  species,
  breed,
  lifeStage,
  sex,
  collarColor,
  birthDate,
  birthDateIsEstimated,
  status,
  healthStatus,
  adoptionStatus,
  createdBy,
  idempotencyKey,
  idempotencyRequestHash,
}) {
  const result = await pool.query(
    `INSERT INTO animals (
      idempotency_key,
      idempotency_request_hash,
      animal_code,
      animal_name,
      species,
      breed,
      life_stage,
      sex,
      collar_color,
      birth_date,
      birth_date_is_estimated,
      status,
      health_status,
      adoption_status,
      created_by,
      updated_by
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $15
    )
    RETURNING
      animal_id,
      animal_code,
      animal_name,
      species,
      breed,
      life_stage,
      sex,
      collar_color,
      birth_date::text AS birth_date,
      birth_date_is_estimated,
      status,
      health_status,
      adoption_status,
      created_by,
      created_at`,
    [
      idempotencyKey,
      idempotencyRequestHash,
      animalCode,
      animalName,
      species,
      breed,
      lifeStage,
      sex,
      collarColor,
      birthDate,
      birthDateIsEstimated,
      status,
      healthStatus,
      adoptionStatus,
      createdBy,
    ],
  );

  return result.rows[0];
}
async function findAnimals({
  search,
  species,
  sex,
  lifeStage,
  healthStatus,
  adoptionStatus,
  status,
  sortBy,
  sortOrder,
  page,
  limit,
}) {
  const conditions = ["a.is_archived = FALSE"];
  const values = [];

  if (species) {
    values.push(species);

    conditions.push(`a.species = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);

    conditions.push(
      `(a.animal_name ILIKE $${values.length}
      OR a.animal_code ILIKE $${values.length}
      OR a.breed ILIKE $${values.length})`,
    );
  }

  if (sex) {
    values.push(sex);

    conditions.push(`a.sex = $${values.length}`);
  }

  if (lifeStage) {
    values.push(lifeStage);

    conditions.push(`a.life_stage = $${values.length}`);
  }

  if (healthStatus) {
    values.push(healthStatus);

    conditions.push(`a.health_status = $${values.length}`);
  }

  if (adoptionStatus) {
    values.push(adoptionStatus);

    conditions.push(`a.adoption_status = $${values.length}`);
  }

  if (status) {
    values.push(status);

    conditions.push(`a.status = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumns = {
    createdAt: "a.created_at",
    animalName: "a.animal_name",
    animalCode: "a.animal_code",
    species: "a.species",
    lifeStage: "a.life_stage",
    healthStatus: "a.health_status",
    adoptionStatus: "a.adoption_status",
  };

  const sortColumn = sortColumns[sortBy] || "a.created_at";

  const order = sortOrder === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;

  // values still contains ONLY filter/search values
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
   FROM animals a
   ${whereClause}`,
    values,
  );

  const totalItems = countResult.rows[0].total;

  // Add pagination values only for the data query
  const dataValues = [...values, limit, offset];

  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;

  const result = await pool.query(
    `SELECT
      a.animal_id,
      a.animal_code,
      a.animal_name,
      a.species,
      a.breed,
      a.life_stage,
      a.sex,
      a.collar_color,
      a.birth_date::text AS birth_date,
      a.birth_date_is_estimated,
      a.status,
      a.health_status,
      a.adoption_status,
      a.created_at,
      a.updated_at
   FROM animals a
   ${whereClause}
   ORDER BY ${sortColumn} ${order}
   LIMIT $${limitPosition}
   OFFSET $${offsetPosition}`,
    dataValues,
  );

  return {
    animals: result.rows,
    totalItems,
  };
}
async function findAnimalById(animalId, db = pool) {
  const result = await db.query(
    `SELECT
      a.animal_id,
      a.animal_code,
      a.animal_name,
      a.species,
      a.breed,
      a.life_stage,
      a.sex,
      a.collar_color,
      a.birth_date::text AS birth_date,
      a.birth_date_is_estimated,
      a.status,
      a.health_status,
      a.adoption_status,
      a.created_by,
      a.updated_by,
      a.created_at,
      a.updated_at
    FROM animals a
    WHERE a.animal_id = $1
    AND a.is_archived = FALSE`,
    [animalId],
  );

  return result.rows[0];
}

async function updateAnimalRecord(animalId, updates, updatedBy) {
  const columnMap = {
    animalName: "animal_name",
    breed: "breed",
    lifeStage: "life_stage",
    sex: "sex",
    collarColor: "collar_color",
    birthDate: "birth_date",
    birthDateIsEstimated: "birth_date_is_estimated",
    healthStatus: "health_status",
  };

  const setClauses = [];
  const values = [];

  for (const [field, value] of Object.entries(updates)) {
    const column = columnMap[field];

    if (!column) continue;

    values.push(value);

    setClauses.push(`${column} = $${values.length}`);
  }

  values.push(updatedBy);
  const updatedByPosition = values.length;

  values.push(animalId);
  const animalIdPosition = values.length;

  const result = await pool.query(
    `UPDATE animals
     SET
       ${setClauses.join(", ")},
       updated_by = $${updatedByPosition},
       updated_at = NOW()
     WHERE animal_id = $${animalIdPosition}
     RETURNING
       animal_id,
       animal_code,
       animal_name,
       species,
       breed,
       life_stage,
       sex,
       collar_color,
       birth_date::text AS birth_date,
       birth_date_is_estimated,
       status,
       health_status,
       adoption_status,
       created_by,
       updated_by,
       created_at,
       updated_at`,
    values,
  );

  return result.rows[0];
}

async function archiveAnimalRecord(animalId, archivedBy) {
  const result = await pool.query(
    `UPDATE animals
     SET
       is_archived = TRUE,
       archived_at = NOW(),
       archived_by = $2,
       updated_by = $2,
       updated_at = NOW()
     WHERE animal_id = $1
       AND is_archived = FALSE
     RETURNING
       animal_id,
       animal_code,
       animal_name,
       is_archived,
       archived_at,
       archived_by`,
    [animalId, archivedBy],
  );

  return result.rows[0];
}

async function findAnimalByIdempotencyKey(createdBy, idempotencyKey) {
  const result = await pool.query(
    `SELECT
      animal_id,
      animal_code,
      animal_name,
      species,
      breed,
      life_stage,
      sex,
      collar_color,
      birth_date::text AS birth_date,
      birth_date_is_estimated,
      status,
      health_status,
      adoption_status,
      created_by,
      updated_by,
      created_at,
      updated_at,
      idempotency_request_hash
    FROM animals
    WHERE created_by = $1
      AND idempotency_key = $2`,
    [createdBy, idempotencyKey],
  );

  return result.rows[0];
}
export {
  getNextAnimalCodeNumber,
  insertAnimal,
  findAnimals,
  findAnimalById,
  updateAnimalRecord,
  archiveAnimalRecord,
  findAnimalByIdempotencyKey,
};

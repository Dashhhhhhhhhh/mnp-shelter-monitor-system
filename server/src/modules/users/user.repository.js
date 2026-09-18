import pool from "../../config/db.js";

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT
        u.user_id,
        u.first_name,
        u.middle_initial,
        u.last_name,
        u.email,
        u.password_hash,
        u.is_active,
        r.role_name
    FROM users u
    JOIN roles r
        ON r.role_id = u.role_id
    WHERE u.email = $1`,
    [email],
  );

  return result.rows[0];
}

async function findUserById(userId) {
  const result = await pool.query(
    `SELECT
      u.user_id,
      u.first_name,
      u.middle_initial,
      u.last_name,
      u.email,
      u.contact_number,
      u.is_active,
      r.role_name
    FROM users u
    JOIN roles r
      ON r.role_id = u.role_id
    WHERE u.user_id = $1`,
    [userId],
  );
  return result.rows[0];
}

async function findRoleByName(roleName) {
  const result = await pool.query(
    `SELECT role_id, role_name
     FROM roles
     WHERE role_name = $1`,
    [roleName],
  );

  return result.rows[0];
}

async function createUser({
  roleId,
  firstName,
  middleInitial,
  lastName,
  email,
  passwordHash,
  contactNumber,
}) {
  const result = await pool.query(
    `INSERT INTO users (
      role_id,
      first_name,
      middle_initial,
      last_name,
      email,
      password_hash,
      contact_number,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    RETURNING
      user_id,
      first_name,
      middle_initial,
      last_name,
      email,
      contact_number,
      is_active`,
    [
      roleId,
      firstName,
      middleInitial,
      lastName,
      email,
      passwordHash,
      contactNumber,
    ],
  );

  return result.rows[0];
}

async function findActiveStaff() {
  const result = await pool.query(
    `
      SELECT
        u.user_id,
        u.first_name,
        u.middle_initial,
        u.last_name,
        r.role_name
      FROM users u
      JOIN roles r
        ON r.role_id = u.role_id
      WHERE u.is_active = TRUE
        AND r.role_name IN ('ADMIN', 'VOLUNTEER', 'CARETAKER')
      ORDER BY
        u.last_name ASC,
        u.first_name ASC
    `,
  );

  return result.rows;
}

export {
  findUserByEmail,
  findUserById,
  findRoleByName,
  createUser,
  findActiveStaff,
};

import "dotenv/config";
import bcrypt from "bcrypt";
import pool from "../../config/db.js";

async function seedAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const firstName = process.env.ADMIN_FIRST_NAME;
    const lastName = process.env.ADMIN_LAST_NAME;

    const roleResult = await pool.query(
      `SELECT role_id
       FROM roles
       WHERE role_name = $1`,
      ["ADMIN"],
    );

    const adminRole = roleResult.rows[0];

    if (!adminRole) {
      throw new Error("ADMIN role does not exist");
    }

    const existingUser = await pool.query(
      `SELECT user_id
       FROM users
       WHERE email = $1`,
      [email],
    );

    if (existingUser.rows[0]) {
      console.log("Admin user already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        role_id,
        first_name,
        last_name,
        email,
        password_hash,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING user_id, email`,
      [adminRole.role_id, firstName, lastName, email, passwordHash],
    );

    console.log("Admin created:", result.rows[0].email);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
  } finally {
    await pool.end();
  }
}

seedAdmin();

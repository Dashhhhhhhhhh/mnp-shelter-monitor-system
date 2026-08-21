import pool from "../config/db.js";

try {
  const res = await pool.query("SELECT 1");
  console.log("Connection OK:", res.rows[0]);
} catch (err) {
  console.error("Connection failed:", err);
} finally {
  await pool.end();
}

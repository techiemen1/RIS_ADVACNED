// models/userModel.js
const { pool } = require("../config/postgres");

exports.createUser = async (user) => {
  const {
    username,
    password_hash,
    full_name,
    email,
    phone_number,
    specialty,
    department,
    profile_picture,
    role,
    created_by,
  } = user;

  const result = await pool.query(
    `INSERT INTO users (
       username, password_hash, full_name, email, phone_number, specialty,
       department, profile_picture, role, created_by, created_at, branch_id
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11)
     RETURNING id, username, role, full_name, email, phone_number,
               specialty, department, profile_picture, is_active, created_at, branch_id`,
    [
      username,
      password_hash,
      full_name,
      email,
      phone_number,
      specialty,
      department,
      profile_picture,
      role,
      created_by,
      user.branch_id || 1
    ]
  );
  return result.rows[0];
};

exports.getUsers = async (limit = 50, offset = 0) => {
  const result = await pool.query(
    "SELECT id, username, role, full_name, email, phone_number, specialty, department, profile_picture, is_active, created_at, branch_id FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return result.rows;
};

exports.getUserByUsername = async (username) => {
  const res = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
  return res.rows[0];
};

exports.getUserById = async (id) => {
  const res = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
  return res.rows[0];
};

exports.updateUser = async (id, fields) => {
  const allowed = [
    "full_name",
    "email",
    "phone_number",
    "specialty",
    "department",
    "profile_picture",
    "role",
    "is_active",
    "updated_by",
  ];

  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return null;

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(id);

  const res = await pool.query(
    `UPDATE users SET ${setClause}, updated_at=NOW()
     WHERE id=$${values.length}
     RETURNING id, username, role, full_name, email, phone_number, specialty, department, is_active`,
    values
  );
  return res.rows[0];
};

exports.updatePassword = async (id, password_hash, updated_by) => {
  const res = await pool.query(
    `UPDATE users
     SET password_hash=$1, updated_by=$2, updated_at=NOW()
     WHERE id=$3 RETURNING id`,
    [password_hash, updated_by, id]
  );
  return res.rows[0];
};

exports.deleteUser = async (id) => {
  const res = await pool.query("DELETE FROM users WHERE id=$1 RETURNING id", [id]);
  return res.rows[0];
};

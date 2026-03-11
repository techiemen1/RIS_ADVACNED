// controllers/userController.js
const bcrypt = require("bcryptjs");
const { pool } = require("../config/postgres");
const fs = require("fs");
const path = require("path");

//
// 🚀 Get all users
//
exports.getUsers = async (req, res) => {
  try {
    const branchScope = req.applyBranchScope ? req.applyBranchScope() : '';
    const result = await pool.query(
      `SELECT id, username, full_name, email, role, phone_number, specialty,
              department, is_active, profile_picture, designation, registration_number, signature_path,
              can_order, can_report, can_schedule, can_sign,
              created_at, updated_at
       FROM users WHERE 1=1 ${branchScope}
       ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

//
// 🚀 Get user by ID
//
exports.getUserById = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

//
// 🚀 Create user
//
exports.createUser = async (req, res) => {
  try {
    const {
      username,
      full_name,
      email,
      password,
      role,
      phone_number,
      specialty,
      department,
      is_active,
      designation,
      registration_number,
      can_order,
      can_report,
      can_schedule,
      can_sign
    } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: "Missing required fields" });

    // Validate allowed roles
    const validRoles = ["admin", "technician", "radiologist", "receptionist", "doctor", "nurse", "staff"];
    if (!validRoles.includes(role))
      return res.status(400).json({ error: "Invalid role" });

    // Check if username or email exists
    const dup = await pool.query(
      "SELECT 1 FROM users WHERE username=$1 OR email=$2",
      [username, email]
    );
    if (dup.rowCount > 0)
      return res.status(409).json({ error: "Username or email already exists" });

    const hash = await bcrypt.hash(
      password,
      parseInt(process.env.PASSWORD_SALT_ROUNDS || "10", 10)
    );

    const result = await pool.query(
      `INSERT INTO users (
          username, full_name, email, password_hash, role,
          phone_number, specialty, department, is_active,
          designation, registration_number, can_order, can_report, can_schedule, can_sign,
          created_by, branch_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING id, username, full_name, email, role, is_active`,
      [
        username,
        full_name,
        email,
        hash,
        role,
        phone_number,
        specialty,
        department,
        is_active ?? true,
        designation || null,
        registration_number || null,
        can_order || false,
        can_report || false,
        can_schedule || false,
        can_sign || false,
        req.user?.username || "system",
        req.branchId || 1 // Branch Isolation context
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ error: "User creation failed" });
  }
};

//
// 🚀 Update user
//
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      full_name,
      email,
      password,
      role,
      phone_number,
      specialty,
      department,
      is_active,
      can_order,
      can_report,
      can_schedule,
      can_sign,
      designation,
      registration_number
    } = req.body;

    // Security: Only Admin or Self can update
    const isSelf = req.user.id === parseInt(id);
    const isAdmin = req.user.role === "admin";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    if (existing.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    const current = existing.rows[0];
    let hash = current.password_hash;

    if (password && password.trim() !== "")
      hash = await bcrypt.hash(
        password,
        parseInt(process.env.PASSWORD_SALT_ROUNDS || "10", 10)
      );

    // Hardening: Non-admins cannot change Role, Active Status, or Department
    let newRole = current.role;
    let newIsActive = current.is_active;
    let newDepartment = current.department;
    let newCanOrder = current.can_order;
    let newCanReport = current.can_report;
    let newCanSchedule = current.can_schedule;
    let newCanSign = current.can_sign;

    if (isAdmin) {
      const validRoles = ["admin", "technician", "radiologist", "receptionist", "doctor", "nurse", "staff"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      newRole = role || current.role;
      newIsActive = is_active ?? current.is_active;
      newDepartment = department || current.department;

      // Only admin can change permissions
      if (can_order !== undefined) newCanOrder = can_order;
      if (can_report !== undefined) newCanReport = can_report;
      if (can_schedule !== undefined) newCanSchedule = can_schedule;
      if (can_sign !== undefined) newCanSign = can_sign;
    }

    // Special case: If user is updating their own profile, they can update designation/reg number
    // Admin can also update these.
    const newDesignation = designation !== undefined ? designation : current.designation;
    const newRegNum = registration_number !== undefined ? registration_number : current.registration_number;


    await pool.query(
      `UPDATE users SET
        username=$1, full_name=$2, email=$3, password_hash=$4, role=$5,
        phone_number=$6, specialty=$7, department=$8, is_active=$9,
        designation=$10, registration_number=$11,
        can_order=$12, can_report=$13, can_schedule=$14, can_sign=$15,
        updated_at=NOW(), updated_by=$16
      WHERE id=$17`,
      [
        username || current.username,
        full_name || current.full_name,
        email || current.email,
        hash,
        newRole,
        phone_number || current.phone_number,
        specialty || current.specialty,
        newDepartment,
        newIsActive,
        newDesignation,
        newRegNum,
        newCanOrder,
        newCanReport,
        newCanSchedule,
        newCanSign,
        req.user?.username || "system",
        id,
      ]
    );

    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

//
// 🚀 Delete user
//
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM users WHERE id=$1 RETURNING id", [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

//
// 🚀 Upload avatar
//
exports.uploadAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const uploadDir = path.join(__dirname, "../uploads/avatars");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = `/uploads/avatars/${req.file.filename}`;
    await pool.query("UPDATE users SET profile_picture=$1 WHERE id=$2", [filePath, id]);

    res.json({ success: true, path: filePath });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};

//
// 🚀 Upload Signature
//
//
// 🚀 Upload Signature
//
exports.uploadSignature = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Only Admin or Self can upload signature
    const isSelf = req.user.id === parseInt(id);
    const isAdmin = req.user.role === "admin";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const uploadDir = path.join(__dirname, "../uploads/signatures");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = `/uploads/signatures/${req.file.filename}`;
    await pool.query("UPDATE users SET signature_path=$1 WHERE id=$2", [filePath, id]);

    res.json({ success: true, path: filePath });
  } catch (err) {
    console.error("uploadSignature error:", err);
    res.status(500).json({ error: "Failed to upload signature" });
  }
};

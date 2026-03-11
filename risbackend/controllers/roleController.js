const { getRoles, createRole } = require('../models/roleModel');
const { setPermission } = require('../models/rolePermissionModel');

exports.listRoles = async (req, res) => {
  try {
    const roles = await getRoles();
    res.json(roles);
  } catch (err) {
    console.error('Roles fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

exports.addRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = await createRole(name, description);
    res.json(role);
  } catch (err) {
    console.error('Role creation error:', err);
    res.status(500).json({ error: 'Failed to create role' });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const { role_id, module_name, permission } = req.body;
    if (!role_id || !module_name || !permission) {
      return res.status(400).json({ error: 'role_id, module_name and permission are required' });
    }
    const result = await setPermission(role_id, module_name, permission);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Update permissions error:', err);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
};

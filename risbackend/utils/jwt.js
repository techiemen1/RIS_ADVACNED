const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

//exports.generateToken = (id, role) => {
//  return jwt.sign({ id, role }, SECRET, { expiresIn: '1h' });
//};
exports.generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' }); // 1 hour expiry
};

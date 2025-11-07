const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateToken = (payload) => {
  // Ensure id is a string to avoid issues when signing ObjectId instances
  const safePayload = { ...payload };
  if (safePayload && safePayload.id && typeof safePayload.id !== 'string' && safePayload.id.toString) {
    safePayload.id = safePayload.id.toString();
  }
  return jwt.sign(safePayload, config.jwt.secret, {
    expiresIn: config.jwt.expire
  });
};

const generateRefreshToken = (payload) => {
  const safePayload = { ...payload };
  if (safePayload && safePayload.id && typeof safePayload.id !== 'string' && safePayload.id.toString) {
    safePayload.id = safePayload.id.toString();
  }
  return jwt.sign(safePayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

const getTokenFromHeader = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  getTokenFromHeader
};
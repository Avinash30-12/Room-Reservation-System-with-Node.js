const { getTokenFromHeader, verifyToken } = require('../utils/jwt');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }
    // Helpful debug logging during tests
    if (process.env.NODE_ENV === 'test') {
      console.log('Auth header token (first 40 chars):', token && token.toString().slice(0, 40));
    }

    const decoded = verifyToken(token);
    if (process.env.NODE_ENV === 'test') {
      console.log('Decoded token payload:', decoded);
    }
    
    // Handle both cases - when decoded contains full user object or just id
    const userId = decoded._doc ? decoded._doc._id : decoded.id;
    const user = await User.findById(userId).select('-password');
    
    if (process.env.NODE_ENV === 'test') {
      console.log('User fetched from DB for id:', userId, '->', user && user._id && user._id.toString());
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token.'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

module.exports = {
  auth,
  authorize
};
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

const authorizeSchoolAccess = (req, res, next) => {
  const { schoolId } = req.params;
  const userSchoolId = req.user.schoolId;

  // Super Admin and Ministry Officer can access all schools
  if (['Super Admin', 'Ministry Officer'].includes(req.user.role)) {
    return next();
  }

  // County Director can access schools in their county
  if (req.user.role === 'County Director' && req.user.county) {
    // This would need additional logic to check if school is in user's county
    return next();
  }

  // School Admin and Teacher can only access their own school
  if (userSchoolId && userSchoolId === schoolId) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied to this school' });
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeSchoolAccess,
};
const jwt = require('jsonwebtoken');
const { dbRun } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'school-mgmt-super-secure-key-2026';

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
};

// Require strictly Admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Permission denied: This action is restricted to Administrators only.'
    });
  }
  next();
};

// Enforce User (Staff) Create & Read only: No Update, No Delete
const enforceUserPermissions = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admin has full permissions
  if (req.user.role === 'admin') {
    return next();
  }

  // Parents are strictly read-only
  if (req.user.role === 'parent') {
    if (req.method !== 'GET') {
      return res.status(403).json({
        error: 'Parent Portal is strictly read-only. Modifying or deleting records is not permitted.'
      });
    }
    return next();
  }

  // Users (Staff) can Create and Read only; NO Update or Delete!
  if (req.user.role === 'user') {
    if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      return res.status(403).json({
        error: 'Permission denied: User role has Create and Read permissions only. Updates and Deletions can only be performed by an Administrator.'
      });
    }
    return next();
  }

  next();
};

// Helper to record audit log
const logAudit = async (userId, username, role, action, moduleName, recordId, details) => {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
    await dbRun(
      `INSERT INTO audit_logs (user_id, username, role, action, module, record_id, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [userId || null, username || 'system', role || 'system', action, moduleName, recordId ? String(recordId) : null, detailsStr]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin,
  enforceUserPermissions,
  logAudit,
};

// JWT authentication + role-based authorization middleware.
import * as authService from '../services/authService.js';

// Require a valid Bearer token; attaches the decoded user to req.user.
export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { status: 401, message: 'Authentication required' } });
  }
  try {
    req.user = authService.verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: { status: 401, message: 'Invalid or expired token' } });
  }
}

// Require the authenticated user to hold one of the given roles.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { status: 401, message: 'Authentication required' } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { status: 403, message: `Forbidden — requires role: ${roles.join(' or ')}` },
      });
    }
    next();
  };
}

export default { requireAuth, requireRole };

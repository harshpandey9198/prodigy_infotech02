/**
 * Authentication middleware
 * Protects routes by checking for a valid session.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

module.exports = { requireAuth };

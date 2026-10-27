const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const authorization = req.get('Authorization')
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i)

  if (!match) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  if (!process.env.JWT_SECRET) {
    console.error('Authentication failed: JWT_SECRET is not configured.')
    return res.status(500).json({ message: 'Authentication is temporarily unavailable.' })
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET)

    if (
      typeof payload !== 'object' ||
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return res.status(401).json({ message: 'Invalid or expired token.' })
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    }

    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

module.exports = authenticateToken

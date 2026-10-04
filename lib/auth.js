/**
 * lib/auth.js
 * Cryptographically Secure Authentication & Session Engine
 * 
 * - Node.js native crypto scrypt with high-entropy salt
 * - Timing-safe password verification
 * - High-entropy session tokens with TTL
 * - Session tracking in DB with revoking capability
 * - Zero external native npm dependencies
 */

const crypto = require('crypto');
const db = require('./db');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hash a plain password using scrypt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify a plain password against a stored scrypt hash in constant time
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // Only accept properly hashed passwords (scrypt format: scrypt$salt$hash)
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const originalKeyHex = parts[2];
      try {
        const derivedKey = crypto.scryptSync(password, salt, 64);
        const derivedKeyHex = derivedKey.toString('hex');
        const bufA = Buffer.from(derivedKeyHex, 'utf8');
        const bufB = Buffer.from(originalKeyHex, 'utf8');
        if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
          return true;
        }
      } catch (_) {}
    }
  }

  return false;
}

/**
 * Create a new authenticated session for a user
 */
function createSession(userId, clientInfo = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session = {
    token,
    userId,
    userAgent: clientInfo.userAgent || '',
    ip: clientInfo.ip || '',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString()
  };

  db.collection('sessions').insertOne(session);

  // Log to audit collection
  db.collection('audit_logs').insertOne({
    action: 'LOGIN_SUCCESS',
    userId,
    ip: clientInfo.ip || '',
    timestamp: new Date().toISOString()
  });

  return session;
}

/**
 * Validate a session token
 */
function validateSession(token) {
  if (!token) return null;
  const session = db.collection('sessions').findOne({ token });
  if (!session) return null;

  // Check expiration
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.collection('sessions').deleteOne({ token });
    return null;
  }

  const user = db.collection('users').findOne({ id: session.userId });
  if (!user) return null;

  // Safe user profile without password hash
  const { passwordHash, ...safeUser } = user;
  return { session, user: safeUser };
}

/**
 * Destroy/Revoke a session (logout)
 */
function destroySession(token) {
  if (!token) return false;
  const session = db.collection('sessions').findOne({ token });
  if (session) {
    db.collection('audit_logs').insertOne({
      action: 'LOGOUT',
      userId: session.userId,
      timestamp: new Date().toISOString()
    });
  }
  return db.collection('sessions').deleteOne({ token });
}

/**
 * Ensure at least one admin account exists on startup
 */
function ensureAdminAccount() {
  const users = db.collection('users');
  const admin = users.findOne({ role: 'admin' });

  if (!admin) {
    // Check if an initial password was passed via environment variable
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'DevnithCMS@2026!';
    const username = process.env.ADMIN_INITIAL_USER || 'admin';

    const newAdmin = {
      username,
      email: 'dnkoralage@gmail.com',
      role: 'admin',
      passwordHash: hashPassword(initialPassword),
      name: 'Devnith Koralage'
    };

    users.insertOne(newAdmin);
    console.log('\n======================================================');
    console.log(' [CMS AUTH] Initial Admin User Initialized:');
    console.log(` Username: ${username}`);
    console.log(` Password: ${initialPassword}`);
    console.log(' Notice: Change this password inside the Admin Dashboard!');
    console.log('======================================================\n');
  }
}

// Run check on module load
ensureAdminAccount();

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  destroySession,
  ensureAdminAccount
};

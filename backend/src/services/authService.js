const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function login(identifier, password) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }],
    },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  const token = signToken(user);
  const { passwordHash, ...safeUser } = user;
  return { token, user: safeUser };
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

module.exports = { login, signToken, hashPassword };

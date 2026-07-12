const bcrypt = require('bcrypt');
const { ALL_ROLES } = require('../config/roles');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const userService = require('./user.service');

const SALT_ROUNDS = 12;

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    roleId: user.role_id,
    roleName: user.role_name,
    isActive: user.is_active,
    createdAt: user.created_at,
  };
}

function createAuthResponse(user) {
  const token = signToken({
    userId: user.id,
    email: user.email,
    roleId: user.role_id,
    roleName: user.role_name,
  });

  return {
    token,
    user: sanitizeUser(user),
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await userService.findByEmail(email);

  // Generic message prevents leaking which emails are registered.
  if (!user || !user.is_active) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  return createAuthResponse(user);
}

async function register({ email, password, fullName, roleName }) {
  if (!email || !password || !fullName || !roleName) {
    throw new AppError('email, password, fullName, and roleName are required.', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  if (!ALL_ROLES.includes(roleName)) {
    throw new AppError(`Invalid role. Allowed roles: ${ALL_ROLES.join(', ')}`, 400);
  }

  const existingUser = await userService.findByEmail(email);
  if (existingUser) {
    throw new AppError('Email is already registered.', 409);
  }

  const role = await userService.findRoleByName(roleName);
  if (!role) {
    throw new AppError(`Role "${roleName}" not found. Run database/seed.sql first.`, 500);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await userService.createUser({
    email,
    passwordHash,
    fullName,
    roleId: role.id,
  });

  return createAuthResponse(user);
}

async function getProfile(userId) {
  const user = await userService.findById(userId);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return sanitizeUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw new AppError('currentPassword and newPassword are required.', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters.', 400);
  }

  const publicUser = await userService.findById(userId);
  if (!publicUser) {
    throw new AppError('User not found.', 404);
  }

  const userWithPassword = await userService.findByEmail(publicUser.email);
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    userWithPassword.password_hash
  );

  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect.', 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userService.updatePassword(userId, passwordHash);

  return { message: 'Password updated successfully.' };
}

module.exports = {
  login,
  register,
  getProfile,
  changePassword,
};

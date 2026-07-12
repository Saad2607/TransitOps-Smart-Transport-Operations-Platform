const authService = require('../services/auth.service');

async function login(req, res) {
  const result = await authService.login(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function register(req, res) {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    data: result,
  });
}

async function getMe(req, res) {
  const profile = await authService.getProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: profile,
  });
}

async function changePassword(req, res) {
  const result = await authService.changePassword(req.user.id, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = {
  login,
  register,
  getMe,
  changePassword,
};

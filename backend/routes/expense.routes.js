const express = require('express');
const expenseController = require('../controllers/expense.controller');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

const READ_ROLES = [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST];
const WRITE_ROLES = [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST];

router.get('/', authorize(...READ_ROLES), asyncHandler(expenseController.listExpenses));
router.post('/', authorize(...WRITE_ROLES), asyncHandler(expenseController.createExpense));

module.exports = router;

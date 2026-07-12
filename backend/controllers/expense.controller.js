const expenseService = require('../services/expense.service');

async function listExpenses(req, res) {
  const expenses = await expenseService.list({
    vehicleId: req.query.vehicleId ? Number(req.query.vehicleId) : undefined,
    category: req.query.category,
  });

  res.status(200).json({ success: true, data: expenses });
}

async function createExpense(req, res) {
  const expense = await expenseService.create(req.body, req.user.id);

  res.status(201).json({
    success: true,
    data: expense,
    message: 'Expense recorded.',
  });
}

module.exports = {
  listExpenses,
  createExpense,
};

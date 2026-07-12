import { useCallback, useEffect, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import FormErrorBanner from '../components/common/FormErrorBanner';
import { expenseApi, vehicleApi } from '../services/api';
import { describeApiError } from '../utils/apiError';
import { formatINR } from '../utils/currency';

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const CATEGORIES = ['Toll', 'Maintenance', 'Fuel', 'Other'];

const emptyForm = {
  vehicleId: '',
  category: 'Toll',
  amount: '',
  description: '',
  expenseDate: '',
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expensesRes, vehiclesRes] = await Promise.all([
        expenseApi.list(),
        vehicleApi.list(),
      ]);
      setExpenses(expensesRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to load expenses.' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await expenseApi.create({
        vehicleId: Number(form.vehicleId),
        category: form.category,
        amount: Number(form.amount),
        description: form.description || null,
        expenseDate: form.expenseDate || null,
      });

      setForm(emptyForm);
      setMessage('Expense recorded successfully.');
      await loadData();
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to record expense.' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Expense Management</h2>
            <p className="text-sm text-slate-500">
              Record tolls, parking, insurance, and other operational expenses.
            </p>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <FormErrorBanner error={error} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Plus className="h-4 w-4" />
          Record Expense
        </h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle</span>
            <select
              className={inputClass}
              value={form.vehicleId}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
              required
            >
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} — {vehicle.nameModel}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Category</span>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              required
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Amount (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="500"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Expense Date</span>
            <input
              type="date"
              className={inputClass}
              value={form.expenseDate}
              onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
            <input
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional notes"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Recent Expenses</h3>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No expenses recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Vehicle</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Amount (₹)</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 20).map((expense) => {
                  const vehicle = vehicles.find((v) => v.id === expense.vehicleId);
                  return (
                    <tr key={expense.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        {vehicle?.registrationNumber || `Vehicle #${expense.vehicleId}`}
                      </td>
                      <td className="px-3 py-2">{expense.category}</td>
                      <td className="px-3 py-2">{formatINR(expense.amount)}</td>
                      <td className="px-3 py-2">{expense.expenseDate?.slice(0, 10) || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

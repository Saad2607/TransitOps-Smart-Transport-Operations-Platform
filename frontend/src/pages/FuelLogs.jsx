import { useCallback, useEffect, useState } from 'react';
import { Fuel, Plus } from 'lucide-react';
import FormErrorBanner from '../components/common/FormErrorBanner';
import { fuelApi, vehicleApi } from '../services/api';
import { describeApiError } from '../utils/apiError';
import { formatINR } from '../utils/currency';

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const emptyForm = {
  vehicleId: '',
  liters: '',
  cost: '',
  odometerKm: '',
  loggedAt: '',
};

export default function FuelLogs() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, vehiclesRes] = await Promise.all([fuelApi.list(), vehicleApi.list()]);
      setLogs(logsRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to load fuel logs.' }));
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
      await fuelApi.create({
        vehicleId: Number(form.vehicleId),
        liters: Number(form.liters),
        cost: Number(form.cost),
        odometerKm: form.odometerKm ? Number(form.odometerKm) : null,
        loggedAt: form.loggedAt || null,
      });

      setForm(emptyForm);
      setMessage('Fuel log recorded successfully.');
      await loadData();
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to record fuel log.' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Fuel Logs</h2>
            <p className="text-sm text-slate-500">
              Track fuel consumption, cost, and odometer readings per vehicle.
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
          Record Fuel Log
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
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Liters</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              className={inputClass}
              value={form.liters}
              onChange={(e) => setForm((prev) => ({ ...prev, liters: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Cost (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={form.cost}
              onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
              placeholder="1980"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Odometer (km)</span>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.odometerKm}
              onChange={(e) => setForm((prev) => ({ ...prev, odometerKm: e.target.value }))}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Logged Date</span>
            <input
              type="date"
              className={inputClass}
              value={form.loggedAt}
              onChange={(e) => setForm((prev) => ({ ...prev, loggedAt: e.target.value }))}
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save Fuel Log'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Recent Fuel Logs</h3>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No fuel logs yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Vehicle</th>
                  <th className="px-3 py-2 font-medium">Liters</th>
                  <th className="px-3 py-2 font-medium">Cost (₹)</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log) => {
                  const vehicle = vehicles.find((v) => v.id === log.vehicleId);
                  return (
                    <tr key={log.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        {vehicle?.registrationNumber || `Vehicle #${log.vehicleId}`}
                      </td>
                      <td className="px-3 py-2">{log.liters} L</td>
                      <td className="px-3 py-2">{formatINR(log.cost)}</td>
                      <td className="px-3 py-2">{log.loggedAt?.slice(0, 10) || '—'}</td>
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

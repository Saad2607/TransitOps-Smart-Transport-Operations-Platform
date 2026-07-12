import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, Wrench } from 'lucide-react';
import FormErrorBanner from '../components/common/FormErrorBanner';
import StatusBadge from '../components/common/StatusBadge';
import { maintenanceApi, vehicleApi } from '../services/api';
import { describeApiError } from '../utils/apiError';
import { formatINR } from '../utils/currency';

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const emptyForm = {
  vehicleId: '',
  title: '',
  description: '',
  cost: '',
};

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [maintenanceRes, vehiclesRes] = await Promise.all([
        maintenanceApi.list(),
        vehicleApi.list(),
      ]);
      setRecords(maintenanceRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to load maintenance records.' }));
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
      await maintenanceApi.create({
        vehicleId: Number(form.vehicleId),
        title: form.title,
        description: form.description || null,
        cost: form.cost ? Number(form.cost) : 0,
      });

      setForm(emptyForm);
      setMessage('Maintenance logged. Vehicle moved to In Shop and removed from dispatch pool.');
      await loadData();
    } catch (err) {
      setError(
        describeApiError(err, {
          titles: {
            409: 'Vehicle unavailable for maintenance',
            403: 'Maintenance not allowed',
          },
          fallbackMessage: 'Failed to log maintenance.',
        })
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(recordId) {
    setError('');
    setMessage('');

    try {
      await maintenanceApi.close(recordId);
      setMessage('Maintenance closed. Vehicle restored to Available.');
      await loadData();
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to close maintenance record.' }));
    }
  }

  const availableForMaintenance = vehicles.filter(
    (v) => v.status === 'Available' && v.status !== 'Retired'
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Maintenance Workflow</h2>
            <p className="text-sm text-slate-500">
              Log service work and automatically move vehicles to In Shop status.
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
          Log Maintenance
        </h3>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle</span>
            <select
              className={inputClass}
              value={form.vehicleId}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
              required
            >
              <option value="">Select available vehicle</option>
              {availableForMaintenance.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} — {vehicle.nameModel}
                </option>
              ))}
            </select>
            {availableForMaintenance.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No Available vehicles — vehicles On Trip or In Shop cannot enter maintenance.
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Oil Change"
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
              placeholder="7100"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              className={`${inputClass} min-h-[96px]`}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Service notes"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving || availableForMaintenance.length === 0}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Log Maintenance'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Maintenance Records</h3>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : records.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No maintenance records yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {records.map((record) => {
              const vehicle = vehicles.find((v) => v.id === record.vehicleId);
              return (
                <article
                  key={record.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {record.title} — {vehicle?.registrationNumber || `#${record.vehicleId}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatINR(record.cost)} · Started {record.startedAt?.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={record.status} />
                    {record.status === 'Active' && (
                      <button
                        type="button"
                        onClick={() => handleClose(record.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Close
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

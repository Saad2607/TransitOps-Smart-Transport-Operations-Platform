import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, UserX } from 'lucide-react';
import FormErrorBanner from '../components/common/FormErrorBanner';
import StatusBadge from '../components/common/StatusBadge';
import { driverApi, fleetApi } from '../services/api';
import { describeApiError } from '../utils/apiError';

function ComplianceSection({ title, icon: Icon, color, emptyText, drivers, onSuspend, showSuspend }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Icon className={`h-5 w-5 ${color}`} />
        {title}
      </h3>
      {drivers.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {drivers.map((driver) => (
            <li
              key={driver.id}
              className="flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{driver.fullName}</p>
                <p className="text-sm text-slate-500">
                  {driver.licenseNumber} · Exp. {driver.licenseExpiry}
                  {driver.safetyScore != null && ` · Safety ${driver.safetyScore}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={driver.status} />
                {showSuspend && driver.status !== 'Suspended' && (
                  <button
                    type="button"
                    onClick={() => onSuspend(driver)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
export default function Compliance() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadCompliance = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fleetApi.getCompliance();
      setReport(response.data);
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to load compliance report.' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompliance();
  }, [loadCompliance]);

  async function handleSuspend(driver) {
    const confirmed = window.confirm(`Suspend driver ${driver.fullName}?`);
    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      await driverApi.suspend(driver.id);
      setMessage(`${driver.fullName} has been suspended.`);
      await loadCompliance();
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to suspend driver.' }));
    }
  }

  const summary = report?.summary || {};

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Driver Compliance</h2>
            <p className="text-sm text-slate-500">
              Monitor license expiry, suspended drivers, and safety compliance metrics.
            </p>
          </div>
        </div>
      </section>

      <FormErrorBanner error={error} />

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Expired Licenses</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {loading ? '…' : summary.expiredCount ?? 0}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Expiring Within 30 Days</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {loading ? '…' : summary.expiringSoonCount ?? 0}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Suspended Drivers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? '…' : summary.suspendedCount ?? 0}
          </p>
        </article>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Loading compliance data…</p>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          <ComplianceSection
            title="Expired Licenses"
            icon={AlertTriangle}
            color="text-red-500"
            emptyText="No expired licenses."
            drivers={report?.expiredLicenses || []}
            onSuspend={handleSuspend}
            showSuspend
          />
          <ComplianceSection
            title="Expiring Soon"
            icon={ShieldCheck}
            color="text-amber-500"
            emptyText="No licenses expiring within 30 days."
            drivers={report?.expiringWithin30Days || []}
            onSuspend={handleSuspend}
            showSuspend
          />
          <ComplianceSection
            title="Suspended Drivers"
            icon={UserX}
            color="text-slate-500"
            emptyText="No suspended drivers."
            drivers={report?.suspendedDrivers || []}
          />        </section>
      )}
    </div>
  );
}

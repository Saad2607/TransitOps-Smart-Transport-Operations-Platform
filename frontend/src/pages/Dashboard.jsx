import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Route, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/roles';
import ExportCsvButton from '../components/common/ExportCsvButton';
import { analyticsApi, tripApi, vehicleApi } from '../services/api';
import { buildExecutiveReportRows } from '../utils/exportCsv';

const roleHighlights = {
  [ROLES.FLEET_MANAGER]: 'Manage vehicles, drivers, trips, and fleet efficiency.',
  [ROLES.DRIVER]: 'Create and monitor trips, update delivery progress.',
  [ROLES.SAFETY_OFFICER]: 'Track license validity and driver compliance.',
  [ROLES.FINANCIAL_ANALYST]: 'Review fuel, maintenance, and operational costs.',
};

function KpiCard({ label, value, icon: Icon, color, hint }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div className={`rounded-xl p-3 text-white ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [utilizationPercent, setUtilizationPercent] = useState(0);
  const [vehicleRoi, setVehicleRoi] = useState([]);
  const [error, setError] = useState('');

  const canViewAnalytics = hasRole(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [vehiclesRes, tripsRes] = await Promise.all([
        vehicleApi.list(),
        tripApi.list(),
      ]);

      setVehicles(vehiclesRes.data || []);
      setTrips(tripsRes.data || []);

      if (canViewAnalytics) {
        try {
          const analyticsRes = await analyticsApi.getDashboard();
          const data = analyticsRes.data;

          setUtilizationPercent(data.fleetUtilization?.utilizationPercent ?? 0);
          setVehicleRoi(data.vehicleRoi || []);
        } catch {
          // Fall back to computed utilization below
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [canViewAnalytics]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const kpis = useMemo(() => {
    const operational = vehicles.filter((v) => v.status !== 'Retired');
    const activeVehicles = operational.filter((v) => v.status === 'On Trip').length;
    const vehiclesInMaintenance = operational.filter((v) => v.status === 'In Shop').length;
    const availableVehicles = operational.filter((v) => v.status === 'Available').length;
    const activeTrips = trips.filter((t) => t.status === 'Dispatched').length;

    const computedUtilization =
      operational.length > 0
        ? Number(((activeVehicles / operational.length) * 100).toFixed(1))
        : 0;

    return {
      activeVehicles,
      vehiclesInMaintenance,
      activeTrips,
      availableVehicles,
      totalFleet: operational.length,
      utilizationPercent:
        utilizationPercent > 0 ? utilizationPercent : computedUtilization,
    };
  }, [vehicles, trips, utilizationPercent]);

  const exportRows = useMemo(
    () =>
      buildExecutiveReportRows({
        kpis,
        vehicleRoi,
        trips: trips.filter((t) => t.status === 'Dispatched' || t.status === 'Draft').slice(0, 50),
      }),
    [kpis, vehicleRoi, trips]
  );

  const kpiCards = [
    {
      label: 'Active Vehicles',
      value: loading ? '…' : kpis.activeVehicles,
      icon: Truck,
      color: 'bg-blue-500',
      hint: 'Currently on trip',
    },
    {
      label: 'Vehicles in Maintenance',
      value: loading ? '…' : kpis.vehiclesInMaintenance,
      icon: Wrench,
      color: 'bg-amber-500',
      hint: 'In shop',
    },
    {
      label: 'Active Trips',
      value: loading ? '…' : kpis.activeTrips,
      icon: Route,
      color: 'bg-violet-500',
      hint: 'Dispatched',
    },
    {
      label: 'Utilization %',
      value: loading ? '…' : `${kpis.utilizationPercent}%`,
      icon: Activity,
      color: 'bg-rose-500',
      hint: canViewAnalytics ? 'Analytics (30d window)' : 'On-trip / fleet ratio',
    },
  ];

  const recentTrips = useMemo(
    () => trips.slice(0, 5),
    [trips]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Executive Dashboard</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Fleet Operations KPIs</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              {roleHighlights[user?.roleName] || 'Monitor transport operations in real time.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
              <ShieldCheck className="h-4 w-4" />
              {user?.roleName}
            </div>
            <ExportCsvButton
              filename={`transitops-executive-report-${new Date().toISOString().slice(0, 10)}`}
              rows={exportRows}
              label="Export Report CSV"
              disabled={loading}
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Recent Trips</h3>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading trips…</p>
          ) : recentTrips.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No trips recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {recentTrips.map((trip) => (
                <li key={trip.id} className="rounded-xl bg-slate-50 px-3 py-2">
                  Trip #{trip.id} — {trip.source} → {trip.destination}{' '}
                  <span className="font-medium text-slate-800">({trip.status})</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {hasRole(ROLES.FLEET_MANAGER, ROLES.DRIVER) && (
              <Link
                to="/trips"
                className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                Book Trip Dispatch
              </Link>
            )}
            {hasRole(ROLES.FLEET_MANAGER) && (
              <Link
                to="/vehicles"
                className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                Manage Vehicles
              </Link>
            )}
            {hasRole(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST) && (
              <Link
                to="/reports"
                className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                View Reports
              </Link>
            )}
            {hasRole(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST, ROLES.DRIVER) && (
              <Link
                to="/fuel-logs"
                className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                Log Fuel
              </Link>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

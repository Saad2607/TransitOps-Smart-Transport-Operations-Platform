import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, Package, Route, ShieldCheck, Truck, UserCheck, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/roles';
import ExportCsvButton from '../components/common/ExportCsvButton';
import SimpleBarChart from '../components/charts/SimpleBarChart';
import { analyticsApi, tripApi, vehicleApi } from '../services/api';
import { buildExecutiveReportRows } from '../utils/exportCsv';

const inputClass =
  'rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

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
  const [kpis, setKpis] = useState(null);
  const [trips, setTrips] = useState([]);
  const [vehicleRoi, setVehicleRoi] = useState([]);
  const [filterMeta, setFilterMeta] = useState({ vehicleTypes: [], regions: [] });
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const canViewAnalytics = hasRole(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    const summaryParams = {};
    if (statusFilter) summaryParams.status = statusFilter;
    if (typeFilter) summaryParams.vehicleType = typeFilter;
    if (regionFilter) summaryParams.region = regionFilter;

    try {
      const requests = [
        analyticsApi.getOperationsSummary(summaryParams),
        tripApi.list(),
        vehicleApi.list(),
      ];

      if (canViewAnalytics) {
        requests.push(analyticsApi.getDashboard());
      }

      const [summaryRes, tripsRes, vehiclesRes, analyticsRes] = await Promise.all(requests);

      setKpis(summaryRes.data);
      setTrips(tripsRes.data || []);

      const vehicles = vehiclesRes.data || [];
      setFilterMeta({
        vehicleTypes: [...new Set(vehicles.map((v) => v.vehicleType).filter(Boolean))],
        regions: [...new Set(vehicles.map((v) => v.region).filter(Boolean))],
      });

      if (analyticsRes?.data) {
        setVehicleRoi(analyticsRes.data.vehicleRoi || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [canViewAnalytics, statusFilter, typeFilter, regionFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const safeKpis = kpis || {
    activeVehicles: 0,
    availableVehicles: 0,
    vehiclesInMaintenance: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    utilizationPercent: 0,
  };

  const exportRows = useMemo(
    () =>
      buildExecutiveReportRows({
        kpis: safeKpis,
        vehicleRoi,
        trips: trips.filter((t) => t.status === 'Dispatched' || t.status === 'Draft').slice(0, 50),
      }),
    [safeKpis, vehicleRoi, trips]
  );

  const fleetStatusChart = useMemo(
    () => [
      { label: 'Available', value: safeKpis.availableVehicles },
      { label: 'On Trip', value: safeKpis.activeVehicles },
      { label: 'In Shop', value: safeKpis.vehiclesInMaintenance },
    ],
    [safeKpis]
  );

  const kpiCards = [
    {
      label: 'Active Vehicles',
      value: loading ? '…' : safeKpis.activeVehicles,
      icon: Truck,
      color: 'bg-blue-500',
      hint: 'Currently on trip',
    },
    {
      label: 'Available Vehicles',
      value: loading ? '…' : safeKpis.availableVehicles,
      icon: Package,
      color: 'bg-emerald-500',
      hint: 'Ready for dispatch',
    },
    {
      label: 'Vehicles in Maintenance',
      value: loading ? '…' : safeKpis.vehiclesInMaintenance,
      icon: Wrench,
      color: 'bg-amber-500',
      hint: 'In shop',
    },
    {
      label: 'Active Trips',
      value: loading ? '…' : safeKpis.activeTrips,
      icon: Route,
      color: 'bg-violet-500',
      hint: 'Dispatched',
    },
    {
      label: 'Pending Trips',
      value: loading ? '…' : safeKpis.pendingTrips,
      icon: Clock3,
      color: 'bg-slate-500',
      hint: 'Draft status',
    },
    {
      label: 'Drivers On Duty',
      value: loading ? '…' : safeKpis.driversOnDuty,
      icon: UserCheck,
      color: 'bg-teal-500',
      hint: 'Available or On Trip',
    },
    {
      label: 'Utilization %',
      value: loading ? '…' : `${safeKpis.utilizationPercent}%`,
      icon: Activity,
      color: 'bg-rose-500',
      hint: 'Fleet utilization',
    },
  ];

  const recentTrips = useMemo(() => trips.slice(0, 5), [trips]);

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

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Vehicle Type</span>
            <select
              className={inputClass}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {filterMeta.vehicleTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Region</span>
            <select
              className={inputClass}
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="">All regions</option>
              {filterMeta.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SimpleBarChart
          title="Fleet Status Distribution"
          data={fleetStatusChart}
          barClass="bg-brand-500"
        />
        <SimpleBarChart
          title="Trip Pipeline"
          data={[
            { label: 'Pending (Draft)', value: safeKpis.pendingTrips },
            { label: 'Active (Dispatched)', value: safeKpis.activeTrips },
          ]}
          barClass="bg-violet-500"
        />
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
            {hasRole(ROLES.FLEET_MANAGER) && (
              <Link
                to="/maintenance"
                className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                Log Maintenance
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

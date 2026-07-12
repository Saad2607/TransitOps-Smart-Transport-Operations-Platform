import { Activity, Bus, Route, ShieldCheck, Truck, Users, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/roles';

const kpiCards = [
  { label: 'Active Vehicles', value: '18', icon: Truck, color: 'bg-blue-500' },
  { label: 'Available Vehicles', value: '12', icon: Bus, color: 'bg-emerald-500' },
  { label: 'In Maintenance', value: '3', icon: Wrench, color: 'bg-amber-500' },
  { label: 'Active Trips', value: '6', icon: Route, color: 'bg-violet-500' },
  { label: 'Drivers On Duty', value: '9', icon: Users, color: 'bg-cyan-500' },
  { label: 'Fleet Utilization', value: '72%', icon: Activity, color: 'bg-rose-500' },
];

const roleHighlights = {
  [ROLES.FLEET_MANAGER]: 'Manage vehicles, drivers, trips, and fleet efficiency.',
  [ROLES.DRIVER]: 'Create and monitor trips, update delivery progress.',
  [ROLES.SAFETY_OFFICER]: 'Track license validity and driver compliance.',
  [ROLES.FINANCIAL_ANALYST]: 'Review fuel, maintenance, and operational costs.',
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Dashboard Overview</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Fleet Operations KPIs</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              {roleHighlights[user?.roleName] || 'Monitor transport operations in real time.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
            <ShieldCheck className="h-4 w-4" />
            {user?.roleName}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`rounded-xl p-3 text-white ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>Trip #104 dispatched — Van-05 to Downtown Hub</li>
            <li>Maintenance opened — Oil change for Truck-12</li>
            <li>Fuel log recorded — 42L for Van-05</li>
            <li>Driver Alex license verified — valid until 2027</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {['Create Trip', 'Register Vehicle', 'Log Fuel', 'View Reports'].map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50"
              >
                {action}
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

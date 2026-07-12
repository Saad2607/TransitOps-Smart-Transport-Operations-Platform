import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Bus,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../config/roles';
import Header from './Header';

const ALL_NAV_ROLES = Object.values(ROLES);

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ALL_NAV_ROLES,
  },
  {
    label: 'Vehicles',
    to: '/vehicles',
    icon: Truck,
    roles: [ROLES.FLEET_MANAGER],
  },
  {
    label: 'Drivers',
    to: '/drivers',
    icon: Users,
    roles: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  },
  {
    label: 'Trips',
    to: '/trips',
    icon: Route,
    roles: [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  },
  {
    label: 'Compliance',
    to: '/compliance',
    icon: ShieldCheck,
    roles: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: BarChart3,
    roles: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  },
  {
    label: 'Expenses',
    to: '/expenses',
    icon: Wallet,
    roles: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  },
  {
    label: 'Fuel Logs',
    to: '/fuel-logs',
    icon: Fuel,
    roles: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST, ROLES.DRIVER],
  },
];

export default function DashboardLayout() {
  const { user, logout, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = navItems.filter((item) => hasRole(...item.roles));

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-white transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">TransitOps</p>
              <p className="text-xs text-slate-400">Fleet Operations</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-300 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 px-3 py-3">
            <p className="truncate text-sm font-medium">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-400">{user?.roleName}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-slate-800">TransitOps</p>
        </div>

        <Header />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

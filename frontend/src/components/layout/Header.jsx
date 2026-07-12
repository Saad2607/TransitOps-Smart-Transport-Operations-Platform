import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Operations Console</h1>
          <p className="text-sm text-slate-500">Welcome back, {user?.fullName}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search fleet..."
              className="w-48 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="hidden rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white sm:block">
            {user?.roleName}
          </div>
        </div>
      </div>
    </header>
  );
}

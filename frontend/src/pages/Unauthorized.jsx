import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="mt-2 text-sm text-slate-500">
          Your role <span className="font-medium text-slate-700">{user?.roleName}</span> does not
          have permission to view this page.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

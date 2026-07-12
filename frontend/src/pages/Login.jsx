import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Bus, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@transitops.local');
  const [password, setPassword] = useState('Admin@456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <section className="hidden text-white lg:block">
          <div className="mb-6 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">TransitOps</p>
              <p className="text-sm text-slate-300">Smart Transport Operations Platform</p>
            </div>
          </div>

          <h1 className="max-w-lg text-4xl font-bold leading-tight">
            Digitize fleet, dispatch, maintenance, and expense management.
          </h1>
          <p className="mt-4 max-w-lg text-slate-300">
            Secure role-based access for Fleet Managers, Drivers, Safety Officers, and Financial
            Analysts.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {['Live Fleet KPIs', 'Trip Dispatch', 'Maintenance Logs', 'Cost Analytics'].map(
              (item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">{item}</p>
                </div>
              )
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Access your TransitOps dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="you@company.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo admin: admin@transitops.local / Admin@456
          </p>
        </section>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Route, Search, Send, CheckCircle2, Ban } from 'lucide-react';
import { tripApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import TripDispatchForm from '../components/trips/TripDispatchForm';
import TripCompleteModal from '../components/trips/TripCompleteModal';
import { filterTrips } from '../utils/tripUtils';
import { describeApiError } from '../utils/apiError';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [completeTrip, setCompleteTrip] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await tripApi.list();
      setTrips(response.data || []);
    } catch (err) {
      setActionMessage(err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const filteredTrips = useMemo(
    () => filterTrips(trips, { search, status: statusFilter }),
    [trips, search, statusFilter]
  );

  const stats = useMemo(
    () => ({
      total: trips.length,
      draft: trips.filter((t) => t.status === 'Draft').length,
      dispatched: trips.filter((t) => t.status === 'Dispatched').length,
      completed: trips.filter((t) => t.status === 'Completed').length,
    }),
    [trips]
  );

  function handleBookSuccess(message) {
    setActionMessage(message);
    setModalOpen(false);
    loadTrips();
  }

  async function handleDispatch(trip) {
    try {
      await tripApi.dispatch(trip.id);
      setActionMessage(`Trip #${trip.id} dispatched. Vehicle and driver are now On Trip.`);
      await loadTrips();
    } catch (err) {
      setActionMessage(err.message || 'Dispatch failed.');
    }
  }

  async function handleCompleteSubmit(payload) {
    if (!completeTrip) return;

    setCompleting(true);
    setCompleteError('');

    try {
      await tripApi.complete(completeTrip.id, payload);
      setActionMessage(
        `Trip #${completeTrip.id} completed. Vehicle and driver restored to Available.`
      );
      setCompleteTrip(null);
      await loadTrips();
    } catch (err) {
      setCompleteError(
        describeApiError(err, { fallbackMessage: 'Failed to complete trip.' })
      );
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel(trip) {
    const confirmed = window.confirm(`Cancel trip #${trip.id}?`);
    if (!confirmed) return;

    try {
      await tripApi.cancel(trip.id);
      setActionMessage(`Trip #${trip.id} cancelled.`);
      await loadTrips();
    } catch (err) {
      setActionMessage(err.message || 'Cancel failed.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Route className="h-3.5 w-3.5" />
              Trip Dispatch
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Trip Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Book trips with dynamically loaded available vehicles and eligible drivers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            New Trip Booking
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total Trips', stats.total, 'bg-slate-900 text-white'],
            ['Draft', stats.draft, 'bg-violet-600 text-white'],
            ['Active (Dispatched)', stats.dispatched, 'bg-blue-600 text-white'],
            ['Completed', stats.completed, 'bg-emerald-600 text-white'],
          ].map(([label, value, colorClass]) => (
            <div key={label} className={`rounded-2xl p-4 ${colorClass}`}>
              <p className="text-sm opacity-90">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search source, destination, trip id..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {actionMessage && (
          <div className="border-b border-slate-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
            {actionMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Distance</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    Loading trips...
                  </td>
                </tr>
              ) : filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    No trips found.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => (
                  <tr key={trip.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">#{trip.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{trip.source}</p>
                      <p className="text-xs text-slate-500">→ {trip.destination}</p>
                    </td>
                    <td className="px-4 py-3">{trip.cargoWeightKg} kg</td>
                    <td className="px-4 py-3">{trip.plannedDistanceKm} km</td>
                    <td className="px-4 py-3">{trip.vehicleId ?? '—'}</td>
                    <td className="px-4 py-3">{trip.driverId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={trip.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {trip.status === 'Draft' && (
                          <button
                            type="button"
                            onClick={() => handleDispatch(trip)}
                            className="rounded-lg border border-brand-200 p-2 text-brand-700 hover:bg-brand-50"
                            aria-label={`Dispatch trip ${trip.id}`}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {trip.status === 'Dispatched' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompleteError('');
                              setCompleteTrip(trip);
                            }}
                            className="rounded-lg border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50"
                            aria-label={`Complete trip ${trip.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {(trip.status === 'Draft' || trip.status === 'Dispatched') && (
                          <button
                            type="button"
                            onClick={() => handleCancel(trip)}
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            aria-label={`Cancel trip ${trip.id}`}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={modalOpen} title="Trip Dispatch Booking" onClose={() => setModalOpen(false)}>
        <TripDispatchForm onSuccess={handleBookSuccess} onCancel={() => setModalOpen(false)} />
      </Modal>

      <TripCompleteModal
        open={Boolean(completeTrip)}
        trip={completeTrip}
        onClose={() => setCompleteTrip(null)}
        onSubmit={handleCompleteSubmit}
        saving={completing}
        error={completeError}
      />
    </div>
  );
}

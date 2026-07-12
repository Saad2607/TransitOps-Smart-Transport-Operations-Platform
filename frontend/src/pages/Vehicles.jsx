import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Truck } from 'lucide-react';
import { vehicleApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import VehicleModal from '../components/vehicles/VehicleModal';
import {
  emptyVehicleForm,
  vehicleToForm,
  formToVehiclePayload,
  filterAndSortVehicles,
} from '../utils/vehicleUtils';
import { describeApiError } from '../utils/apiError';

const VEHICLE_ERROR_TITLES = {
  409: 'Duplicate registration number',
  400: 'Invalid vehicle details',
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('availability');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [form, setForm] = useState(emptyVehicleForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vehicleApi.list();
      setVehicles(response.data || []);
    } catch (err) {
      setActionMessage(err.message || 'Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const filteredVehicles = useMemo(
    () => filterAndSortVehicles(vehicles, { search, sortBy }),
    [vehicles, search, sortBy]
  );

  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      available: vehicles.filter((v) => v.status === 'Available').length,
      onTrip: vehicles.filter((v) => v.status === 'On Trip').length,
      inShop: vehicles.filter((v) => v.status === 'In Shop').length,
    };
  }, [vehicles]);

  function openCreateModal() {
    setModalMode('create');
    setSelectedVehicle(null);
    setForm(emptyVehicleForm);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(vehicle) {
    setModalMode('edit');
    setSelectedVehicle(vehicle);
    setForm(vehicleToForm(vehicle));
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setError('');
  }

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = formToVehiclePayload(form);

      if (modalMode === 'edit' && selectedVehicle) {
        await vehicleApi.update(selectedVehicle.id, payload);
        setActionMessage('Vehicle updated successfully.');
      } else {
        await vehicleApi.create(payload);
        setActionMessage('Vehicle added successfully.');
      }

      closeModal();
      await loadVehicles();
    } catch (err) {
      setError(
        describeApiError(err, {
          titles: VEHICLE_ERROR_TITLES,
          fallbackMessage: 'Failed to save vehicle.',
        })
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(vehicle) {
    const confirmed = window.confirm(`Delete vehicle ${vehicle.registrationNumber}?`);
    if (!confirmed) return;

    try {
      await vehicleApi.remove(vehicle.id);
      setActionMessage('Vehicle deleted successfully.');
      await loadVehicles();
    } catch (err) {
      setActionMessage(err.message || 'Failed to delete vehicle.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Truck className="h-3.5 w-3.5" />
              Vehicle Registry
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Vehicle Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage fleet assets, capacity, odometer readings, and operational status.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total Vehicles', stats.total, 'bg-slate-900 text-white'],
            ['Available', stats.available, 'bg-emerald-600 text-white'],
            ['On Trip', stats.onTrip, 'bg-blue-600 text-white'],
            ['In Shop', stats.inShop, 'bg-amber-500 text-white'],
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
              placeholder="Search registration, model, type, region..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="availability">Sort by Availability</option>
            <option value="name">Sort by Name</option>
            <option value="registration">Sort by Registration</option>
            <option value="newest">Sort by Newest</option>
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
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    Loading vehicles...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    No vehicles found.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {vehicle.registrationNumber}
                    </td>
                    <td className="px-4 py-3">{vehicle.nameModel}</td>
                    <td className="px-4 py-3">{vehicle.vehicleType}</td>
                    <td className="px-4 py-3">{vehicle.maxLoadCapacityKg} kg</td>
                    <td className="px-4 py-3">{vehicle.odometerKm} km</td>
                    <td className="px-4 py-3">{vehicle.region || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(vehicle)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          aria-label={`Edit ${vehicle.registrationNumber}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(vehicle)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          aria-label={`Delete ${vehicle.registrationNumber}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <VehicleModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        error={error}
        saving={saving}
        onClose={closeModal}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

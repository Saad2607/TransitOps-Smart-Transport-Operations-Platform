import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Users, ShieldBan } from 'lucide-react';
import { driverApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/roles';
import StatusBadge from '../components/common/StatusBadge';
import DriverModal from '../components/drivers/DriverModal';
import {
  emptyDriverForm,
  driverToForm,
  formToDriverPayload,
  filterAndSortDrivers,
} from '../utils/driverUtils';

export default function Drivers() {
  const { hasRole } = useAuth();
  const canManage = hasRole(ROLES.FLEET_MANAGER);
  const canSuspend = hasRole(ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER);

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('availability');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [form, setForm] = useState(emptyDriverForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await driverApi.list();
      setDrivers(response.data || []);
    } catch (err) {
      setActionMessage(err.message || 'Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const filteredDrivers = useMemo(
    () => filterAndSortDrivers(drivers, { search, sortBy }),
    [drivers, search, sortBy]
  );

  const stats = useMemo(() => {
    return {
      total: drivers.length,
      available: drivers.filter((d) => d.status === 'Available').length,
      onTrip: drivers.filter((d) => d.status === 'On Trip').length,
      suspended: drivers.filter((d) => d.status === 'Suspended').length,
      expired: drivers.filter((d) => d.isLicenseExpired).length,
    };
  }, [drivers]);

  function openCreateModal() {
    setModalMode('create');
    setSelectedDriver(null);
    setForm(emptyDriverForm);
    setError('');
    setModalOpen(true);
  }

  function openEditModal(driver) {
    setModalMode('edit');
    setSelectedDriver(driver);
    setForm(driverToForm(driver));
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
      const payload = formToDriverPayload(form);

      if (modalMode === 'edit' && selectedDriver) {
        await driverApi.update(selectedDriver.id, payload);
        setActionMessage('Driver updated successfully.');
      } else {
        await driverApi.create(payload);
        setActionMessage('Driver added successfully.');
      }

      closeModal();
      await loadDrivers();
    } catch (err) {
      setError(err.message || 'Failed to save driver.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(driver) {
    const confirmed = window.confirm(`Delete driver ${driver.fullName}?`);
    if (!confirmed) return;

    try {
      await driverApi.remove(driver.id);
      setActionMessage('Driver deleted successfully.');
      await loadDrivers();
    } catch (err) {
      setActionMessage(err.message || 'Failed to delete driver.');
    }
  }

  async function handleSuspend(driver) {
    const confirmed = window.confirm(`Suspend driver ${driver.fullName}?`);
    if (!confirmed) return;

    try {
      await driverApi.suspend(driver.id);
      setActionMessage(`${driver.fullName} has been suspended.`);
      await loadDrivers();
    } catch (err) {
      setActionMessage(err.message || 'Failed to suspend driver.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Users className="h-3.5 w-3.5" />
              Driver Management
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Driver Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Track license validity, safety scores, duty status, and compliance readiness.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              Add Driver
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Total Drivers', stats.total, 'bg-slate-900 text-white'],
            ['Available', stats.available, 'bg-emerald-600 text-white'],
            ['On Trip', stats.onTrip, 'bg-blue-600 text-white'],
            ['Suspended', stats.suspended, 'bg-red-600 text-white'],
            ['Expired License', stats.expired, 'bg-amber-500 text-white'],
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
              placeholder="Search name, license, contact, status..."
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
            <option value="licenseExpiry">Sort by License Expiry</option>
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Safety</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    Loading drivers...
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{driver.fullName}</td>
                    <td className="px-4 py-3">{driver.licenseNumber}</td>
                    <td className="px-4 py-3">{driver.licenseCategory}</td>
                    <td className="px-4 py-3">
                      <span className={driver.isLicenseExpired ? 'font-semibold text-red-600' : ''}>
                        {driver.licenseExpiry}
                      </span>
                    </td>
                    <td className="px-4 py-3">{driver.contactNumber}</td>
                    <td className="px-4 py-3">{driver.safetyScore}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={driver.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(driver)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                              aria-label={`Edit ${driver.fullName}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(driver)}
                              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                              aria-label={`Delete ${driver.fullName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {canSuspend && driver.status !== 'Suspended' && (
                          <button
                            type="button"
                            onClick={() => handleSuspend(driver)}
                            className="rounded-lg border border-amber-200 p-2 text-amber-700 hover:bg-amber-50"
                            aria-label={`Suspend ${driver.fullName}`}
                          >
                            <ShieldBan className="h-4 w-4" />
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

      {canManage && (
        <DriverModal
          open={modalOpen}
          mode={modalMode}
          form={form}
          error={error}
          saving={saving}
          onClose={closeModal}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

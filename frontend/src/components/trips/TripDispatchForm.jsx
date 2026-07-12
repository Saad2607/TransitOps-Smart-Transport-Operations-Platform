import { useEffect, useMemo, useState } from 'react';
import { Route, Truck, User } from 'lucide-react';
import FormErrorBanner from '../common/FormErrorBanner';
import { driverApi, tripApi, vehicleApi } from '../../services/api';
import { describeApiError } from '../../utils/apiError';
import { emptyTripForm, formToTripPayload } from '../../utils/tripUtils';

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export default function TripDispatchForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState(emptyTripForm);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAssets() {
      setLoadingAssets(true);
      try {
        const [vehiclesRes, driversRes] = await Promise.all([
          vehicleApi.list({ status: 'Available' }),
          driverApi.listEligible(),
        ]);

        setAvailableVehicles(vehiclesRes.data || []);
        setEligibleDrivers(driversRes.data || []);
      } catch (err) {
        setError(
          describeApiError(err, {
            fallbackMessage: 'Failed to load available vehicles and drivers.',
          })
        );
      } finally {
        setLoadingAssets(false);
      }
    }

    loadAssets();
  }, []);

  const selectedVehicle = useMemo(
    () => availableVehicles.find((v) => String(v.id) === form.vehicleId),
    [availableVehicles, form.vehicleId]
  );

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event, dispatchAfterCreate = false) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = formToTripPayload(form);
      const created = await tripApi.create(payload);
      const tripId = created.data.id;

      if (dispatchAfterCreate) {
        await tripApi.dispatch(tripId);
      }

      setForm(emptyTripForm);
      onSuccess?.(
        dispatchAfterCreate
          ? 'Trip booked and dispatched successfully.'
          : 'Trip draft created successfully.'
      );
    } catch (err) {
      setError(
        describeApiError(err, {
          titles: {
            400: 'Dispatch validation failed',
            403: 'Asset not available',
            409: 'Scheduling conflict',
          },
          fallbackMessage: 'Failed to book trip.',
        })
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={(e) => handleSubmit(e, false)}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Source">
          <input
            className={inputClass}
            value={form.source}
            onChange={(e) => handleChange('source', e.target.value)}
            placeholder="Warehouse North"
            required
          />
        </Field>

        <Field label="Destination">
          <input
            className={inputClass}
            value={form.destination}
            onChange={(e) => handleChange('destination', e.target.value)}
            placeholder="Downtown Hub"
            required
          />
        </Field>

        <Field label="Available Vehicle">
          <div className="relative">
            <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className={`${inputClass} pl-10`}
              value={form.vehicleId}
              onChange={(e) => handleChange('vehicleId', e.target.value)}
              required
              disabled={loadingAssets}
            >
              <option value="">
                {loadingAssets ? 'Loading vehicles…' : 'Select available vehicle'}
              </option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} — {vehicle.nameModel} ({vehicle.maxLoadCapacityKg}{' '}
                  kg)
                </option>
              ))}
            </select>
          </div>
          {!loadingAssets && availableVehicles.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">No available vehicles right now.</p>
          )}
        </Field>

        <Field label="Eligible Driver">
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className={`${inputClass} pl-10`}
              value={form.driverId}
              onChange={(e) => handleChange('driverId', e.target.value)}
              required
              disabled={loadingAssets}
            >
              <option value="">
                {loadingAssets ? 'Loading drivers…' : 'Select eligible driver'}
              </option>
              {eligibleDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName} — {driver.licenseNumber} (exp. {driver.licenseExpiry})
                </option>
              ))}
            </select>
          </div>
          {!loadingAssets && eligibleDrivers.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">No dispatch-eligible drivers found.</p>
          )}
        </Field>

        <Field label="Cargo Weight (kg)">
          <input
            type="number"
            min="1"
            max={selectedVehicle?.maxLoadCapacityKg || undefined}
            className={inputClass}
            value={form.cargoWeightKg}
            onChange={(e) => handleChange('cargoWeightKg', e.target.value)}
            placeholder={selectedVehicle ? `Max ${selectedVehicle.maxLoadCapacityKg} kg` : '500'}
            required
          />
          {selectedVehicle && (
            <p className="mt-1 text-xs text-slate-500">
              Max capacity: {selectedVehicle.maxLoadCapacityKg} kg
            </p>
          )}
        </Field>

        <Field label="Planned Distance (km)">
          <input
            type="number"
            min="1"
            className={inputClass}
            value={form.plannedDistanceKm}
            onChange={(e) => handleChange('plannedDistanceKm', e.target.value)}
            placeholder="120"
            required
          />
        </Field>
      </div>

      <FormErrorBanner error={error} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || loadingAssets}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-70"
        >
          <Route className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button
          type="button"
          disabled={saving || loadingAssets}
          onClick={(e) => handleSubmit(e, true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
        >
          <Route className="h-4 w-4" />
          {saving ? 'Dispatching…' : 'Book & Dispatch'}
        </button>
      </div>
    </form>
  );
}

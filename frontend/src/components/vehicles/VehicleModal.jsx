import Modal from '../common/Modal';
import FormErrorBanner from '../common/FormErrorBanner';
import { VEHICLE_STATUSES } from '../../utils/vehicleUtils';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export default function VehicleModal({ open, mode, form, error, saving, onClose, onChange, onSubmit }) {
  return (
    <Modal open={open} title={mode === 'edit' ? 'Edit Vehicle' : 'Add Vehicle'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Registration Number">
            <input
              className={inputClass}
              value={form.registrationNumber}
              onChange={(e) => onChange('registrationNumber', e.target.value)}
              placeholder="Van-05"
              required
            />
          </Field>

          <Field label="Name / Model">
            <input
              className={inputClass}
              value={form.nameModel}
              onChange={(e) => onChange('nameModel', e.target.value)}
              placeholder="Ford Transit"
              required
            />
          </Field>

          <Field label="Vehicle Type">
            <input
              className={inputClass}
              value={form.vehicleType}
              onChange={(e) => onChange('vehicleType', e.target.value)}
              placeholder="Van"
              required
            />
          </Field>

          <Field label="Region">
            <input
              className={inputClass}
              value={form.region}
              onChange={(e) => onChange('region', e.target.value)}
              placeholder="North"
            />
          </Field>

          <Field label="Max Load Capacity (kg)">
            <input
              type="number"
              min="1"
              className={inputClass}
              value={form.maxLoadCapacityKg}
              onChange={(e) => onChange('maxLoadCapacityKg', e.target.value)}
              required
            />
          </Field>

          <Field label="Odometer (km)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.odometerKm}
              onChange={(e) => onChange('odometerKm', e.target.value)}
            />
          </Field>

          <Field label="Acquisition Cost (₹)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.acquisitionCost}
              onChange={(e) => onChange('acquisitionCost', e.target.value)}
              placeholder="2500000"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Example: ₹25,00,000 for a delivery van</p>
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => onChange('status', e.target.value)}
            >
              {VEHICLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <FormErrorBanner error={error} />

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Vehicle' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

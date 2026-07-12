import Modal from '../common/Modal';
import { DRIVER_STATUSES } from '../../utils/driverUtils';

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

export default function DriverModal({ open, mode, form, error, saving, onClose, onChange, onSubmit }) {
  return (
    <Modal open={open} title={mode === 'edit' ? 'Edit Driver' : 'Add Driver'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full Name">
            <input
              className={inputClass}
              value={form.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
              placeholder="Alex Driver"
              required
            />
          </Field>

          <Field label="License Number">
            <input
              className={inputClass}
              value={form.licenseNumber}
              onChange={(e) => onChange('licenseNumber', e.target.value)}
              placeholder="DL-12345"
              required
            />
          </Field>

          <Field label="License Category">
            <input
              className={inputClass}
              value={form.licenseCategory}
              onChange={(e) => onChange('licenseCategory', e.target.value)}
              placeholder="LMV"
              required
            />
          </Field>

          <Field label="License Expiry">
            <input
              type="date"
              className={inputClass}
              value={form.licenseExpiry}
              onChange={(e) => onChange('licenseExpiry', e.target.value)}
              required
            />
          </Field>

          <Field label="Contact Number">
            <input
              className={inputClass}
              value={form.contactNumber}
              onChange={(e) => onChange('contactNumber', e.target.value)}
              placeholder="+91 9876543210"
              required
            />
          </Field>

          <Field label="Safety Score">
            <input
              type="number"
              min="0"
              max="100"
              className={inputClass}
              value={form.safetyScore}
              onChange={(e) => onChange('safetyScore', e.target.value)}
              required
            />
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => onChange('status', e.target.value)}
            >
              {DRIVER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

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
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Driver' : 'Add Driver'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

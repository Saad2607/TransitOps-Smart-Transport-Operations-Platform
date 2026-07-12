import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import FormErrorBanner from '../common/FormErrorBanner';
import { describeApiError } from '../../utils/apiError';

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export default function TripCompleteModal({ open, trip, onClose, onSubmit, saving, error }) {
  const [form, setForm] = useState({
    actualDistanceKm: trip?.plannedDistanceKm ?? '',
    finalOdometerKm: '',
    fuelConsumedLiters: '',
    revenue: '',
  });

  useEffect(() => {
    if (trip) {
      setForm({
        actualDistanceKm: trip.plannedDistanceKm ?? '',
        finalOdometerKm: '',
        fuelConsumedLiters: '',
        revenue: '',
      });
    }
  }, [trip]);

  if (!trip) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      actualDistanceKm: Number(form.actualDistanceKm),
      finalOdometerKm: form.finalOdometerKm ? Number(form.finalOdometerKm) : null,
      fuelConsumedLiters: form.fuelConsumedLiters ? Number(form.fuelConsumedLiters) : null,
      revenue: form.revenue ? Number(form.revenue) : null,
    });
  }

  return (
    <Modal open={open} title={`Complete Trip #${trip.id}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-slate-500">
          {trip.source} → {trip.destination} · Planned {trip.plannedDistanceKm} km
        </p>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Actual Distance (km)</span>
          <input
            type="number"
            min="1"
            className={inputClass}
            value={form.actualDistanceKm}
            onChange={(e) => handleChange('actualDistanceKm', e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Final Odometer (km)</span>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={form.finalOdometerKm}
            onChange={(e) => handleChange('finalOdometerKm', e.target.value)}
            placeholder="Enter final odometer reading"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Fuel Consumed (liters)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            className={inputClass}
            value={form.fuelConsumedLiters}
            onChange={(e) => handleChange('fuelConsumedLiters', e.target.value)}
            placeholder="e.g. 22"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Trip Revenue (₹)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={form.revenue}
            onChange={(e) => handleChange('revenue', e.target.value)}
            placeholder="Optional revenue for ROI"
          />
        </label>

        <FormErrorBanner error={error} />

        <div className="flex justify-end gap-3">
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
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            {saving ? 'Completing…' : 'Complete Trip'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

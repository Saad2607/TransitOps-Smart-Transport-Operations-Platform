export const emptyTripForm = {
  source: '',
  destination: '',
  vehicleId: '',
  driverId: '',
  cargoWeightKg: '',
  plannedDistanceKm: '',
};

export function tripToForm(trip) {
  return {
    source: trip.source || '',
    destination: trip.destination || '',
    vehicleId: trip.vehicleId ? String(trip.vehicleId) : '',
    driverId: trip.driverId ? String(trip.driverId) : '',
    cargoWeightKg: trip.cargoWeightKg != null ? String(trip.cargoWeightKg) : '',
    plannedDistanceKm: trip.plannedDistanceKm != null ? String(trip.plannedDistanceKm) : '',
  };
}

export function formToTripPayload(form) {
  return {
    source: form.source.trim(),
    destination: form.destination.trim(),
    vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
    driverId: form.driverId ? Number(form.driverId) : null,
    cargoWeightKg: Number(form.cargoWeightKg),
    plannedDistanceKm: Number(form.plannedDistanceKm),
  };
}

export function filterTrips(trips, { search = '', status = '' } = {}) {
  const query = search.trim().toLowerCase();

  return trips.filter((trip) => {
    const matchesStatus = !status || trip.status === status;
    const matchesSearch =
      !query ||
      trip.source.toLowerCase().includes(query) ||
      trip.destination.toLowerCase().includes(query) ||
      String(trip.id).includes(query);

    return matchesStatus && matchesSearch;
  });
}

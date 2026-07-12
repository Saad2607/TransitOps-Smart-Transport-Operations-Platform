export const VEHICLE_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

export const emptyVehicleForm = {
  registrationNumber: '',
  nameModel: '',
  vehicleType: '',
  maxLoadCapacityKg: '',
  odometerKm: '0',
  acquisitionCost: '',
  status: 'Available',
  region: '',
};

export function vehicleToForm(vehicle) {
  if (!vehicle) return emptyVehicleForm;

  return {
    registrationNumber: vehicle.registrationNumber || '',
    nameModel: vehicle.nameModel || '',
    vehicleType: vehicle.vehicleType || '',
    maxLoadCapacityKg: String(vehicle.maxLoadCapacityKg ?? ''),
    odometerKm: String(vehicle.odometerKm ?? '0'),
    acquisitionCost: String(vehicle.acquisitionCost ?? ''),
    status: vehicle.status || 'Available',
    region: vehicle.region || '',
  };
}

export function formToVehiclePayload(form) {
  return {
    registrationNumber: form.registrationNumber.trim(),
    nameModel: form.nameModel.trim(),
    vehicleType: form.vehicleType.trim(),
    maxLoadCapacityKg: Number(form.maxLoadCapacityKg),
    odometerKm: Number(form.odometerKm || 0),
    acquisitionCost: Number(form.acquisitionCost),
    status: form.status,
    region: form.region.trim() || null,
  };
}

const AVAILABILITY_ORDER = {
  Available: 1,
  'On Trip': 2,
  'In Shop': 3,
  Retired: 4,
};

export function filterAndSortVehicles(vehicles, { search, sortBy }) {
  const query = search.trim().toLowerCase();

  let result = vehicles.filter((vehicle) => {
    if (!query) return true;

    return [
      vehicle.registrationNumber,
      vehicle.nameModel,
      vehicle.vehicleType,
      vehicle.region,
      vehicle.status,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  result = [...result].sort((a, b) => {
    if (sortBy === 'name') {
      return a.nameModel.localeCompare(b.nameModel);
    }

    if (sortBy === 'registration') {
      return a.registrationNumber.localeCompare(b.registrationNumber);
    }

    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    const rankA = AVAILABILITY_ORDER[a.status] ?? 99;
    const rankB = AVAILABILITY_ORDER[b.status] ?? 99;

    if (rankA !== rankB) return rankA - rankB;
    return a.registrationNumber.localeCompare(b.registrationNumber);
  });

  return result;
}

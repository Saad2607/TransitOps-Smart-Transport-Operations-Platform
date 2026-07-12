export const DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

export const emptyDriverForm = {
  fullName: '',
  licenseNumber: '',
  licenseCategory: '',
  licenseExpiry: '',
  contactNumber: '',
  safetyScore: '100',
  status: 'Available',
};

export function driverToForm(driver) {
  if (!driver) return emptyDriverForm;

  return {
    fullName: driver.fullName || '',
    licenseNumber: driver.licenseNumber || '',
    licenseCategory: driver.licenseCategory || '',
    licenseExpiry: driver.licenseExpiry?.slice?.(0, 10) || driver.licenseExpiry || '',
    contactNumber: driver.contactNumber || '',
    safetyScore: String(driver.safetyScore ?? '100'),
    status: driver.status || 'Available',
  };
}

export function formToDriverPayload(form) {
  return {
    fullName: form.fullName.trim(),
    licenseNumber: form.licenseNumber.trim(),
    licenseCategory: form.licenseCategory.trim(),
    licenseExpiry: form.licenseExpiry,
    contactNumber: form.contactNumber.trim(),
    safetyScore: Number(form.safetyScore),
    status: form.status,
  };
}

const DRIVER_AVAILABILITY_ORDER = {
  Available: 1,
  'On Trip': 2,
  'Off Duty': 3,
  Suspended: 4,
};

export function filterAndSortDrivers(drivers, { search, sortBy }) {
  const query = search.trim().toLowerCase();

  let result = drivers.filter((driver) => {
    if (!query) return true;

    return [
      driver.fullName,
      driver.licenseNumber,
      driver.licenseCategory,
      driver.contactNumber,
      driver.status,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  result = [...result].sort((a, b) => {
    if (sortBy === 'name') {
      return a.fullName.localeCompare(b.fullName);
    }

    if (sortBy === 'licenseExpiry') {
      return new Date(a.licenseExpiry) - new Date(b.licenseExpiry);
    }

    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    const rankA = DRIVER_AVAILABILITY_ORDER[a.status] ?? 99;
    const rankB = DRIVER_AVAILABILITY_ORDER[b.status] ?? 99;

    if (rankA !== rankB) return rankA - rankB;
    return a.fullName.localeCompare(b.fullName);
  });

  return result;
}

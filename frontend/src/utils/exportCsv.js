/**
 * Escape a CSV cell and wrap when needed.
 */
function escapeCell(value) {
  if (value == null) return '';

  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Convert an array of row arrays to CSV text.
 * @param {Array<Array<string|number|null|undefined>>} rows
 */
export function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/**
 * Trigger a browser download of CSV content.
 * @param {string} filename
 * @param {Array<Array<string|number|null|undefined>>} rows
 */
export function downloadCsv(filename, rows) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Build executive dashboard export rows from KPI + optional ROI/trip data.
 */
export function buildExecutiveReportRows({ kpis, vehicleRoi = [], trips = [] }) {
  const rows = [
    ['TransitOps Executive Report'],
    ['Generated At', new Date().toISOString()],
    [],
    ['KPI', 'Value'],
    ['Active Vehicles (On Trip)', kpis.activeVehicles],
    ['Vehicles in Maintenance', kpis.vehiclesInMaintenance],
    ['Active Trips', kpis.activeTrips],
    ['Fleet Utilization %', kpis.utilizationPercent],
    ['Available Vehicles', kpis.availableVehicles],
    ['Total Fleet (non-retired)', kpis.totalFleet],
    [],
  ];

  if (vehicleRoi.length > 0) {
    rows.push(
      ['Vehicle ROI'],
      [
        'Registration',
        'Model',
        'Revenue',
        'Fuel Cost',
        'Maintenance Cost',
        'Net Profit',
        'ROI %',
        'Completed Trips',
      ]
    );

    vehicleRoi.forEach((v) => {
      rows.push([
        v.registrationNumber,
        v.nameModel,
        v.totalRevenue,
        v.fuelCost,
        v.maintenanceCost,
        v.netProfit,
        v.roiPercent ?? '',
        v.completedTrips,
      ]);
    });

    rows.push([]);
  }

  if (trips.length > 0) {
    rows.push(['Active / Recent Trips'], ['ID', 'Source', 'Destination', 'Status', 'Cargo (kg)']);

    trips.forEach((t) => {
      rows.push([t.id, t.source, t.destination, t.status, t.cargoWeightKg]);
    });
  }

  return rows;
}

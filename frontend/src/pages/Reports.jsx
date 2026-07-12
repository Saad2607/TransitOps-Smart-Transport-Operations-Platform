import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Fuel, TrendingUp, Wallet, Wrench } from 'lucide-react';
import ExportCsvButton from '../components/common/ExportCsvButton';
import ExportPdfButton from '../components/common/ExportPdfButton';
import FormErrorBanner from '../components/common/FormErrorBanner';
import SimpleBarChart from '../components/charts/SimpleBarChart';
import { analyticsApi, fuelApi, maintenanceApi } from '../services/api';
import { describeApiError } from '../utils/apiError';
import { formatINR } from '../utils/currency';

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-xl p-3 text-white ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const [dashboardRes, fuelRes, maintenanceRes] = await Promise.all([
        analyticsApi.getDashboard(params),
        fuelApi.list(),
        maintenanceApi.list(),
      ]);

      setDashboard(dashboardRes.data);
      setFuelLogs(fuelRes.data || []);
      setMaintenanceRecords(maintenanceRes.data || []);
    } catch (err) {
      setError(describeApiError(err, { fallbackMessage: 'Failed to load reports.' }));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const summary = dashboard?.summary || {};
  const utilization = dashboard?.fleetUtilization || {};
  const roiRows = dashboard?.vehicleRoi || [];
  const fuelEfficiency = dashboard?.fuelEfficiency || { fleet: {}, vehicles: [] };

  const totalFuelCost = useMemo(
    () => fuelLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0),
    [fuelLogs]
  );

  const totalMaintenanceCost = useMemo(
    () => maintenanceRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0),
    [maintenanceRecords]
  );

  const exportRows = useMemo(
    () => [
      [
        'Registration',
        'Model',
        'Revenue (₹)',
        'Fuel Cost (₹)',
        'Maintenance Cost (₹)',
        'Net Profit (₹)',
        'ROI %',
        'Completed Trips',
      ],
      ...roiRows.map((row) => [
        row.registrationNumber,
        row.nameModel,
        row.totalRevenue,
        row.fuelCost,
        row.maintenanceCost,
        row.netProfit,
        row.roiPercent ?? '',
        row.completedTrips,
      ]),
    ],
    [roiRows]
  );

  const utilizationChart = useMemo(
    () => [
      { label: 'Utilized', value: utilization.utilizedVehicles ?? 0 },
      {
        label: 'Idle',
        value: Math.max(
          (utilization.activeFleet ?? 0) - (utilization.utilizedVehicles ?? 0),
          0
        ),
      },
    ],
    [utilization]
  );

  const roiChart = useMemo(
    () =>
      roiRows.slice(0, 6).map((row) => ({
        label: row.registrationNumber,
        value: row.roiPercent ?? 0,
      })),
    [roiRows]
  );

  const fuelEfficiencyChart = useMemo(
    () =>
      (fuelEfficiency.vehicles || []).slice(0, 6).map((row) => ({
        label: row.registrationNumber,
        value: row.kmPerLiter ?? 0,
      })),
    [fuelEfficiency]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-600">Reports & Analytics</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Operational Performance</h2>
            <p className="mt-2 text-sm text-slate-500">
              Fleet utilization, fuel efficiency (km/L), operational cost, and vehicle ROI.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ExportCsvButton
              filename={`transitops-reports-${new Date().toISOString().slice(0, 10)}`}
              rows={exportRows}
              label="Export CSV"
              disabled={loading || roiRows.length === 0}
            />
            <ExportPdfButton disabled={loading} label="Export PDF" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="date"
            className={inputClass}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            className={inputClass}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
          <button
            type="button"
            onClick={loadReports}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Apply Filters
          </button>
        </div>
      </section>

      <FormErrorBanner error={error} />

      <div id="report-print-area">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Fleet Utilization"
            value={loading ? '…' : `${utilization.utilizationPercent ?? 0}%`}
            icon={BarChart3}
            color="bg-violet-500"
          />
          <MetricCard
            label="Fuel Efficiency"
            value={
              loading
                ? '…'
                : fuelEfficiency.fleet?.kmPerLiter != null
                  ? `${fuelEfficiency.fleet.kmPerLiter} km/L`
                  : 'N/A'
            }
            icon={Fuel}
            color="bg-cyan-500"
          />
          <MetricCard
            label="Fleet Revenue"
            value={loading ? '…' : formatINR(summary.fleetRevenue || 0, { compact: true })}
            icon={TrendingUp}
            color="bg-emerald-500"
          />
          <MetricCard
            label="Operating Cost"
            value={loading ? '…' : formatINR(summary.fleetOperatingCost || 0, { compact: true })}
            icon={Wallet}
            color="bg-amber-500"
          />
          <MetricCard
            label="Avg ROI"
            value={
              loading
                ? '…'
                : summary.avgRoiPercent != null
                  ? `${summary.avgRoiPercent}%`
                  : 'N/A'
            }
            icon={TrendingUp}
            color="bg-blue-500"
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <SimpleBarChart
            title="Fleet Utilization Breakdown"
            data={utilizationChart}
            valueFormatter={(v) => `${v} vehicles`}
            barClass="bg-violet-500"
          />
          <SimpleBarChart
            title="Vehicle ROI (Top 6)"
            data={roiChart}
            valueFormatter={(v) => `${v}%`}
            barClass="bg-emerald-500"
          />
          <SimpleBarChart
            title="Fuel Efficiency km/L (Top 6)"
            data={fuelEfficiencyChart}
            valueFormatter={(v) => `${v} km/L`}
            barClass="bg-cyan-500"
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Fuel className="h-5 w-5 text-brand-600" />
              Fuel Efficiency Snapshot
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Fleet distance (completed trips)</dt>
                <dd className="font-medium text-slate-800">
                  {fuelEfficiency.fleet?.totalDistanceKm ?? 0} km
                </dd>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Total liters logged</dt>
                <dd className="font-medium text-slate-800">
                  {Number(fuelEfficiency.fleet?.totalLiters ?? 0).toFixed(1)} L
                </dd>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Distance / Fuel (fleet avg)</dt>
                <dd className="font-medium text-slate-800">
                  {fuelEfficiency.fleet?.kmPerLiter != null
                    ? `${fuelEfficiency.fleet.kmPerLiter} km/L`
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Total fuel spend</dt>
                <dd className="font-medium text-slate-800">{formatINR(totalFuelCost)}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Wrench className="h-5 w-5 text-brand-600" />
              Maintenance Cost Summary
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Maintenance records</dt>
                <dd className="font-medium text-slate-800">{maintenanceRecords.length}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Active in shop</dt>
                <dd className="font-medium text-slate-800">
                  {maintenanceRecords.filter((r) => r.status === 'Active').length}
                </dd>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Total maintenance spend</dt>
                <dd className="font-medium text-slate-800">{formatINR(totalMaintenanceCost)}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">Total operational cost (Fuel + Maintenance)</dt>
                <dd className="font-medium text-slate-800">
                  {formatINR(totalFuelCost + totalMaintenanceCost)}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Vehicle ROI Table</h3>
          <p className="mt-1 text-xs text-slate-500">
            ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost × 100
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading ROI data…</p>
          ) : roiRows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No ROI data for the selected period.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Vehicle</th>
                    <th className="px-3 py-2 font-medium">Revenue (₹)</th>
                    <th className="px-3 py-2 font-medium">Fuel (₹)</th>
                    <th className="px-3 py-2 font-medium">Maintenance (₹)</th>
                    <th className="px-3 py-2 font-medium">Net Profit (₹)</th>
                    <th className="px-3 py-2 font-medium">ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {roiRows.map((row) => (
                    <tr key={row.vehicleId} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {row.registrationNumber}
                      </td>
                      <td className="px-3 py-2">{formatINR(row.totalRevenue)}</td>
                      <td className="px-3 py-2">{formatINR(row.fuelCost)}</td>
                      <td className="px-3 py-2">{formatINR(row.maintenanceCost)}</td>
                      <td className="px-3 py-2">{formatINR(row.netProfit)}</td>
                      <td className="px-3 py-2">
                        {row.roiPercent != null ? `${row.roiPercent}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Per-Vehicle Fuel Efficiency</h3>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading fuel efficiency…</p>
          ) : (fuelEfficiency.vehicles || []).length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Complete trips and log fuel to calculate km/L efficiency.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Vehicle</th>
                    <th className="px-3 py-2 font-medium">Distance (km)</th>
                    <th className="px-3 py-2 font-medium">Fuel (L)</th>
                    <th className="px-3 py-2 font-medium">Efficiency (km/L)</th>
                    <th className="px-3 py-2 font-medium">Fuel Cost (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelEfficiency.vehicles.map((row) => (
                    <tr key={row.vehicleId} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{row.registrationNumber}</td>
                      <td className="px-3 py-2">{row.totalDistanceKm}</td>
                      <td className="px-3 py-2">{row.totalLiters}</td>
                      <td className="px-3 py-2">
                        {row.kmPerLiter != null ? `${row.kmPerLiter} km/L` : '—'}
                      </td>
                      <td className="px-3 py-2">{formatINR(row.fuelCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

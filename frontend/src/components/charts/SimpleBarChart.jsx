/**
 * Simple horizontal bar chart (no external chart library).
 */
export default function SimpleBarChart({ title, data, valueFormatter = (v) => v, barClass = 'bg-brand-500' }) {
  if (!data?.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">No data available.</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3">
        {data.map((item) => {
          const value = Number(item.value) || 0;
          const width = `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`;

          return (
            <li key={item.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="text-slate-500">{valueFormatter(value)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${barClass}`} style={{ width }} />
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

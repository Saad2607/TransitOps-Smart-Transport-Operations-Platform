const STATUS_STYLES = {
  Available: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  'On Trip': 'bg-blue-100 text-blue-700 ring-blue-200',
  'In Shop': 'bg-amber-100 text-amber-700 ring-amber-200',
  Retired: 'bg-slate-100 text-slate-600 ring-slate-200',
  'Off Duty': 'bg-slate-100 text-slate-700 ring-slate-200',
  Suspended: 'bg-red-100 text-red-700 ring-red-200',
  Draft: 'bg-violet-100 text-violet-700 ring-violet-200',
  Dispatched: 'bg-cyan-100 text-cyan-700 ring-cyan-200',
  Completed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-700 ring-rose-200',
};

export default function StatusBadge({ status }) {
  const styles = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-200';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`}>
      {status}
    </span>
  );
}

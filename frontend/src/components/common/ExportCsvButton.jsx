import { Download } from 'lucide-react';
import { downloadCsv } from '../../utils/exportCsv';

export default function ExportCsvButton({
  filename,
  rows,
  label = 'Export CSV',
  disabled = false,
  className = '',
}) {
  function handleExport() {
    if (!rows?.length) return;
    downloadCsv(filename, rows);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || !rows?.length}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

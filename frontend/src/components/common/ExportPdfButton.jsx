import { Printer } from 'lucide-react';

/**
 * Opens the browser print dialog (Save as PDF) for the current page section.
 */
export default function ExportPdfButton({
  targetId = 'report-print-area',
  label = 'Export PDF',
  disabled = false,
  className = '',
}) {
  function handleExport() {
    const target = document.getElementById(targetId);
    if (!target) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TransitOps Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1,h2,h3 { margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
            .metric { display: inline-block; margin: 0 16px 16px 0; }
          </style>
        </head>
        <body>${target.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}

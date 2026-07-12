import { AlertTriangle } from 'lucide-react';

/**
 * Error banner for form modals. Accepts either a plain string or a
 * `{ title, message }` object produced by `describeApiError`.
 */
export default function FormErrorBanner({ error }) {
  if (!error) return null;

  const title = typeof error === 'string' ? null : error.title;
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <p>{message}</p>
      </div>
    </div>
  );
}

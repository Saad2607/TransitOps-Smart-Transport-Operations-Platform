export default function PagePlaceholder({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">{description}</p>
      <p className="mt-6 inline-flex rounded-full bg-brand-50 px-4 py-2 text-xs font-medium text-brand-700">
        Module coming next — API integration pending
      </p>
    </div>
  );
}

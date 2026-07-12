import { Bus } from 'lucide-react';

export default function BrandLogo({ variant = 'dark', showText = true, className = '' }) {
  const titleClass = variant === 'dark' ? 'text-white' : 'text-slate-900';
  const subtitleClass = variant === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/20">
        <Bus className="h-5 w-5 text-white" />
      </div>
      {showText && (
        <div>
          <p className={`text-sm font-semibold tracking-wide ${titleClass}`}>TransitOps</p>
          <p className={`text-xs ${subtitleClass}`}>Fleet Operations</p>
        </div>
      )}
    </div>
  );
}

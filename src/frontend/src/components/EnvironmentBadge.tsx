import React from 'react';

interface EnvironmentBadgeProps {
  environmentLabel?: string;
}

const ENV_COLORS: Record<string, string> = {
  production: 'bg-emerald-500/80 text-emerald-50',
  prod: 'bg-emerald-500/80 text-emerald-50',
  staging: 'bg-amber-500/80 text-amber-50',
  preview: 'bg-sky-500/80 text-sky-50',
  development: 'bg-purple-500/80 text-purple-50',
  dev: 'bg-purple-500/80 text-purple-50',
};

const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({ environmentLabel }) => {
  const mode = import.meta.env.MODE;
  const env = (environmentLabel || import.meta.env.VITE_APP_ENVIRONMENT || mode || 'dev').toString();
  const normalized = env.toLowerCase();
  const colorClass = ENV_COLORS[normalized] || 'bg-slate-600/80 text-slate-100';

  return (
    <div
      className={`pill text-xs font-semibold ${colorClass} shadow-card transition-all duration-150 hover:scale-[1.01]`}
      title={`Environment: ${env}`}
    >
      <span className="badge-dot bg-white/80" aria-hidden />
      <span>{env}</span>
    </div>
  );
};

export default EnvironmentBadge;

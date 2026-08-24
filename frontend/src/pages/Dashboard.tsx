import React from 'react';
import type { VehicleRepair } from '../types/repair';
import { getSeverityColor, getSeverityGlow, PANEL_STYLE, SEVERITY_TEXT } from '../styles/controls';

const MonthlyReportCard = ({ repairs }: { repairs: VehicleRepair[] }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[now.getMonth()];

  const isThisMonth = (dateString?: string | null) => {
    if (!dateString) return false;
    const [yearStr, monthStr] = dateString.split('-');
    if (!yearStr || !monthStr) return false;
    return parseInt(yearStr) === currentYear && parseInt(monthStr) === currentMonth;
  };

  const completedThisMonth = repairs.filter(r => r.status === 'COMPLETED' && isThisMonth(r.actualCompletionDate));
  const intakeThisMonth = repairs.filter(r => isThisMonth(r.entryDate));

  const avgSeverityStr = completedThisMonth.length > 0
    ? (completedThisMonth.reduce((sum, r) => sum + (r.severity || 0), 0) / completedThisMonth.length).toFixed(1)
    : '0.0';

  const avgSeverityNum = parseFloat(avgSeverityStr);
  let avgTextColor = 'text-sev-1';
  if (avgSeverityNum >= 4.5) avgTextColor = 'text-sev-5';
  else if (avgSeverityNum >= 3.5) avgTextColor = 'text-sev-4';
  else if (avgSeverityNum >= 2.5) avgTextColor = 'text-sev-3';
  else if (avgSeverityNum >= 1.5) avgTextColor = 'text-sev-2';

  const serviceCounts: Record<string, number> = {};
  completedThisMonth.forEach(r => {
    if (r.serviceType) {
      serviceCounts[r.serviceType] = (serviceCounts[r.serviceType] || 0) + 1;
    }
  });

  let topService = "None Yet";
  let maxCount = 0;
  Object.entries(serviceCounts).forEach(([service, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topService = service;
    }
  });

  return (
    <div className={`${PANEL_STYLE} p-6`}>
      <div className="flex justify-between items-end border-b border-amstar-line-soft pb-3 mb-4">
        <div>
          <h3 className="font-cond text-lg font-bold text-amstar-ink uppercase tracking-wider">Shop Performance Report</h3>
          <p className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest">{monthName} {currentYear}</p>
        </div>
        <span className="bg-amstar-raised text-amstar-ink-dim font-cond uppercase tracking-widest px-3 py-1 rounded-sm text-[11px] border border-amstar-line">
          Live Data
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-amstar-line-soft">
        <div className="px-4 text-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">Completed</span>
          <span className="font-mono text-3xl font-bold tabular-nums text-sev-1">{completedThisMonth.length}</span>
          <span className="block text-[10px] text-amstar-ink-faint font-medium mt-1">Vehicles fixed</span>
        </div>

        <div className="px-4 text-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">New Intake</span>
          <span className="font-mono text-3xl font-bold tabular-nums text-sev-2">{intakeThisMonth.length}</span>
          <span className="block text-[10px] text-amstar-ink-faint font-medium mt-1">Vehicles added</span>
        </div>

        <div className="px-4 text-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">Avg Severity</span>
          <span className={`font-mono text-3xl font-bold tabular-nums transition-colors ${avgTextColor}`}>{avgSeverityStr}</span>
          <span className="block text-[10px] text-amstar-ink-faint font-medium mt-1">Out of 5.0</span>
        </div>

        <div className="px-4 text-center flex flex-col justify-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">Top Service</span>
          <span className="text-sm font-bold text-amstar-ink leading-tight line-clamp-2">{topService}</span>
        </div>
      </div>
    </div>
  );
};

const CircularProgress = ({ percent, color, label, count }: { percent: number; color: string; label: string; count: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className={`${PANEL_STYLE} flex flex-col items-center p-6 flex-1`}>
      <svg width="100" height="100">
        <circle stroke="#162b48" fill="transparent" strokeWidth="8" r={radius} cx="50" cy="50" />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth="8"
          r={radius}
          cx="50"
          cy="50"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          transform="rotate(-90 50 50)"
        />
        {/* Tick marks at the cardinal points */}
        <g stroke="#2d5590" strokeWidth="1.5">
          <line x1="50" y1="4" x2="50" y2="10" />
          <line x1="96" y1="50" x2="90" y2="50" />
          <line x1="50" y1="96" x2="50" y2="90" />
          <line x1="4" y1="50" x2="10" y2="50" />
        </g>
        <text x="50" y="50" fill="#eef3fa" fontSize="1.5rem" fontWeight="bold" textAnchor="middle" dy=".3em" fontFamily='"Roboto Mono", ui-monospace, monospace'>
          {count}
        </text>
      </svg>
      <div className="font-cond uppercase tracking-widest text-sm text-amstar-ink-dim mt-3 text-center">{label}</div>
    </div>
  );
};

export const Dashboard: React.FC<{ repairs: VehicleRepair[] }> = ({ repairs }) => {
  const totalRepairs = repairs.length;
  const pendingCount = repairs.filter(r => r.status === 'PENDING').length;
  const inProgressCount = repairs.filter(r => r.status === 'IN_PROGRESS').length;
  const completedCount = repairs.filter(r => r.status === 'COMPLETED').length;

  const pendingPercent = totalRepairs === 0 ? 0 : (pendingCount / totalRepairs) * 100;
  const inProgressPercent = totalRepairs === 0 ? 0 : (inProgressCount / totalRepairs) * 100;
  const completedPercent = totalRepairs === 0 ? 0 : (completedCount / totalRepairs) * 100;

  const activeWorkers = repairs.filter(r => r.status === 'IN_PROGRESS' && r.assignedWorker);
  const criticalPending = repairs.filter(r => r.status === 'PENDING' && r.severity >= 4).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-amstar-red pb-2">
        <h2 className="font-cond text-2xl font-bold uppercase tracking-wider text-amstar-ink">Real-Time Shop Metrics</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CircularProgress percent={pendingPercent} color="#f0a02a" label="Vehicles Pending" count={pendingCount} />
        <CircularProgress percent={inProgressPercent} color="#38bdf8" label="Vehicles In Progress" count={inProgressCount} />
        <CircularProgress percent={completedPercent} color="#10b981" label="Vehicles Completed" count={completedCount} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Active Bays */}
        <div className={`${PANEL_STYLE} p-6`}>
          <h3 className="font-cond text-base uppercase tracking-widest text-amstar-ink-dim border-b border-amstar-line-soft pb-3 mb-4">
            Active Bays (In Progress)
          </h3>
          {activeWorkers.length === 0 ? (
            <p className="text-sm text-amstar-ink-faint">No technicians are currently working on active jobs.</p>
          ) : (
            <ul className="divide-y divide-amstar-line-soft max-h-64 overflow-y-auto pr-2">
              {activeWorkers.map(item => (
                <li key={item.id} className="py-3 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-sev-2 animate-pulse shrink-0" />
                  <div>
                    <span className="font-bold text-amstar-ink">{item.assignedWorker}</span>
                    <span className="text-xs text-amstar-ink-dim block">
                      {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model} — {item.serviceType}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Critical Approvals */}
        <div className={`${PANEL_STYLE} p-6`}>
          <h3 className="font-cond text-base uppercase tracking-widest text-amstar-red-ink border-b border-amstar-line-soft pb-3 mb-4">
            Critical Pending Vehicles
          </h3>
          {criticalPending.length === 0 ? (
            <p className="text-sm text-amstar-ink-faint">No critical tickets are pending.</p>
          ) : (
            <ul className="divide-y divide-amstar-line-soft max-h-64 overflow-y-auto pr-2">
              {criticalPending.map(item => (
                <li key={item.id} className="py-3 flex justify-between items-center">
                  <div>
                    <strong className="text-amstar-ink text-sm">{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</strong>
                    <span className="text-xs text-amstar-ink-dim block">{item.serviceType}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className={`px-2 py-0.5 ${SEVERITY_TEXT} rounded-sm font-cond text-xs uppercase tracking-wider ${getSeverityColor(item.severity)} ${getSeverityGlow(item.severity)}`}>
                      Level {item.severity}
                    </span>
                    <span className="font-mono text-xs text-amstar-ink-faint block mt-0.5 tabular-nums">Score: {item.priorityScore?.toFixed(1)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MonthlyReportCard repairs={repairs} />

    </div>
  );
};

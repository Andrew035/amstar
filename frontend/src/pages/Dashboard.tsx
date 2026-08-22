import React from 'react';
import type { VehicleRepair } from '../types/repair';

// === NEW: UNIVERSAL SEVERITY COLOR HELPER ===
const getSeverityColor = (severity: number) => {
  switch (severity) {
    case 1: return 'bg-emerald-500';
    case 2: return 'bg-blue-500';
    case 3: return 'bg-amber-500';
    case 4: return 'bg-orange-500';
    case 5: return 'bg-red-600';
    default: return 'bg-slate-500';
  }
};

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
  let avgTextColor = 'text-emerald-500';
  if (avgSeverityNum >= 4.5) avgTextColor = 'text-red-600';
  else if (avgSeverityNum >= 3.5) avgTextColor = 'text-orange-500';
  else if (avgSeverityNum >= 2.5) avgTextColor = 'text-amber-500';
  else if (avgSeverityNum >= 1.5) avgTextColor = 'text-blue-500';

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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-end border-b border-slate-100 pb-3 mb-4">
        <div>
          <h3 className="text-lg font-black text-amstar-blue uppercase tracking-tight">Shop Performance Report</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{monthName} {currentYear}</p>
        </div>
        <span className="bg-sky-100 text-sky-700 font-bold px-3 py-1 rounded-full text-xs">
          Live Data
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-slate-100">
        <div className="px-4 text-center">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completed</span>
          <span className="text-3xl font-black text-emerald-600">{completedThisMonth.length}</span>
          <span className="block text-[10px] text-slate-400 font-medium mt-1">Vehicles fixed</span>
        </div>

        <div className="px-4 text-center">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">New Intake</span>
          <span className="text-3xl font-black text-blue-600">{intakeThisMonth.length}</span>
          <span className="block text-[10px] text-slate-400 font-medium mt-1">Vehicles added</span>
        </div>

        <div className="px-4 text-center">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Severity</span>
          <span className={`text-3xl font-black transition-colors ${avgTextColor}`}>{avgSeverityStr}</span>
          <span className="block text-[10px] text-slate-400 font-medium mt-1">Out of 5.0</span>
        </div>

        <div className="px-4 text-center flex flex-col justify-center">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Top Service</span>
          <span className="text-sm font-bold text-slate-700 leading-tight line-clamp-2">{topService}</span>
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
    <div className="flex flex-col items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
      <svg width="100" height="100">
        <circle stroke="#f1f5f9" fill="transparent" strokeWidth="8" r={radius} cx="50" cy="50" />
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
        <text x="50" y="50" fill="#0f172a" fontSize="1.5rem" fontWeight="bold" textAnchor="middle" dy=".3em">
          {count}
        </text>
      </svg>
      <div className="text-sm font-bold text-slate-600 mt-3 text-center">{label}</div>
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
        <h2 className="text-2xl font-black text-amstar-blue">Real-Time Shop Metrics</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CircularProgress percent={pendingPercent} color="#f59e0b" label="Vehicles Pending" count={pendingCount} />
        <CircularProgress percent={inProgressPercent} color="#3b82f6" label="Vehicles In Progress" count={inProgressCount} />
        <CircularProgress percent={completedPercent} color="#10b981" label="Vehicles Completed" count={completedCount} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Active Bays */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4">
            Active Bays (In Progress)
          </h3>
          {activeWorkers.length === 0 ? (
            <p className="text-sm text-slate-400">No technicians are currently working on active jobs.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-2">
              {activeWorkers.map(item => (
                <li key={item.id} className="py-3 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">{item.assignedWorker}</span>
                    <span className="text-xs text-slate-500 block">
                      {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model} — {item.serviceType}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Critical Approvals */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-red-600 border-b border-slate-100 pb-3 mb-4">
            Critical Pending Vehicles
          </h3>
          {criticalPending.length === 0 ? (
            <p className="text-sm text-slate-400">No critical tickets are pending.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-2">
              {criticalPending.map(item => (
                <li key={item.id} className="py-3 flex justify-between items-center">
                  <div>
                    <strong className="text-slate-800 text-sm">{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</strong>
                    <span className="text-xs text-slate-500 block">{item.serviceType}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {/* === UPDATED: UNIVERSAL SEVERITY COLORS APPLIED HERE === */}
                    <span className={`px-2 py-0.5 text-white rounded text-xs font-bold shadow-sm ${getSeverityColor(item.severity)}`}>
                      Level {item.severity}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">Score: {item.priorityScore?.toFixed(1)}</span>
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

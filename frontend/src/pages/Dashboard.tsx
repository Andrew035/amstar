import React from 'react';
import type { VehicleRepair } from '../types/repair';

// Circular Progress Component
const CircularProgress = ({ percent, color, label, count }: { percent: number; color: string; label: string; count: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className='flex flex-col items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1'>
      <svg width='100' height='100'>
        <circle stroke='#f1f5f9' fill='transparent' strokeWidth='8' r={radius} cx='50' cy='50' />
        <circle
          stroke={color}
          fill='transparent'
          strokeWidth='8'
          r={radius}
          cx='50'
          cy='50'
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap='round'
          className='transition-all duration-1000 ease-out'
          transform='rotate(-90 50 50)'
        />
        <text x='50' y='50' fill='#0f172a' fontSize='1.5rem' fontWeight='bold' textAnchor='middle' dy='0.3em'>
          {count}
        </text>
      </svg>
      <div className='text-sm font-bold text-slate-600 mt-3 text-center'>{label}</div>
    </div>
  );
};

export const Dashboard: React.FC<{ repairs: VehicleRepair[] }> = ({ repairs }) => {
  // Metric Calculations
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
    <div className='space-y-6'>
      <div className='border-b-2 border-amstar-red pb-2'>
        <h2 className='text-2xl font-black text-amstar-blue'>Real-Time Shop Metrics</h2>
      </div>

      {/* Progress Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <CircularProgress percent={pendingPercent} color='#f59e0b' label='Vehicles Pending Repair' count={pendingCount} />
        <CircularProgress percent={inProgressPercent} color='#3b82f6' label='Vehicles In Repair Process' count={inProgressCount} />
        <CircularProgress percent={completedPercent} color='#10b981' label='Vehicle Repairs Completed' count={completedCount} />
      </div>

      {/* Bay Status & Approvals */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>

        {/* Active Bays */}
        <div className='bg-white p-6 rounded-xl border border-slate-200 shadow-sm'>
          <h3 className='text-base font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4'>
            Active Bays (In Progress)
          </h3>
          {activeWorkers.length === 0 ? (
            <p className='text-sm text-slate-400'>No technicians are currently working on active jobs.</p>
          ) : (
            <ul className='divide-y divide-slate-100'>
              {activeWorkers.map(item => (
                <li key={item.id} className='py-3 flex items-center gap-3'>
                  <span className='w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse' />
                  <div>
                    <span className='font-bold text-slate-800'>{item.assignedWorker}</span>
                    <span className='text-xs text-slate-500 block'>
                      {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model} - {item.serviceType}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Critical Approvals */}
        <div className='bg-white p-6 rounded-xl border border-slate-200 shadow-sm'>
          <h3 className='text-base font-bold text-red-600 border-b border-slate-100 pb-3 mb-4'>
            Critical Pending Vehicles
          </h3>
          {criticalPending.length === 0 ? (
            <p className='text-sm text-slate-400'>No critical repairs are pending.</p>
          ) : (
            <ul className='divide-y divide-slate-100'>
              {criticalPending.map(item => (
                <li key={item.id} className='py-3 flex justify-between items-center'>
                  <div>
                    <strong className='text-slate-800 text-sm'>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</strong>
                    <span className='text-xs text-slate-500 block'>{item.serviceType}</span>
                  </div>
                  <div className='text-right'>
                    <span className='px-2 py-0.5 bg-red-500 text-white rounded text-xs font-bold'>
                      Level {item.severity}
                    </span>
                    <span className='text-xs text-slate-400 block mt-0.5'>Score: {item.priorityScore?.toFixed(1)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from "react";
import type { VehicleRepair } from "../types/repair";
import { RepairForm } from "../components/RepairForm";

const SEARCH_INPUT_STYLE = "w-full sm:w-80 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 shadow-sm transition-all focus:outline-none focus:border-amstar-blue focus:ring-2 focus:ring-amstar-blue/20";
const TABLE_DROPDOWN_STYLE = "px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-amstar-blue/20 hover:border-amstar-blue";
const INLINE_INPUT_STYLE = "px-3 py-1.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-amstar-blue rounded-lg text-xs font-bold text-slate-700 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amstar-blue/20 cursor-pointer uppercase w-full";

const MultiWorkerDropdown: React.FC<{
  currentWorkers: string | undefined;
  onAssign: (workers: string) => void;
}> = ({ currentWorkers, onAssign }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const workersList = ["Technician 1", "Technician 2", "Technician 3"];

  const selectedArray = currentWorkers ? currentWorkers.split(',').map(w => w.trim()).filter(w => w !== '') : [];

  const handleToggle = (workerName: string) => {
    let updatedSelection = selectedArray.includes(workerName)
      ? selectedArray.filter(w => w !== workerName)
      : [...selectedArray, workerName];
    onAssign(updatedSelection.join(', '));
  };

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left });
    setIsOpen(true);
  };

  return (
    <>
      <div onClick={openDropdown} className={`${TABLE_DROPDOWN_STYLE} flex justify-between items-center min-w-[130px] max-w-[180px]`}>
        <span className="truncate" title={selectedArray.length === 0 ? 'Unassigned' : selectedArray.join(', ')}>
          {selectedArray.length === 0 ? 'Unassigned' : selectedArray.join(', ')}
        </span>
        <span className="text-[10px] ml-2 text-slate-400 shrink-0">▼</span>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className="fixed bg-white border border-slate-200 shadow-2xl rounded-lg z-[101] overflow-hidden w-48" style={{ top: coords.top, left: coords.left }} onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">Assign Technicians</div>
            <div className="max-h-48 overflow-y-auto p-1">
              {workersList.map(worker => (
                <label key={worker} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50 rounded cursor-pointer transition">
                  <input type="checkbox" checked={selectedArray.includes(worker)} onChange={() => handleToggle(worker)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-slate-300 cursor-pointer" />
                  <span className="text-xs font-bold text-slate-700">{worker}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
};

const EditableServiceCell: React.FC<{
  value: string;
  historicalMap: Record<string, number>;
  onChange: (val: string) => void;
}> = ({ value, historicalMap, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setSearch(value || ''); }, [value]);

  const currentSegment = search.split(',').pop()?.trim() || '';

  const filteredServices = Object.keys(historicalMap).filter(service =>
    service.toLowerCase().includes(currentSegment.toLowerCase())
  );

  const handleSelect = (service: string) => {
    const upper = service.toUpperCase();
    const parts = search.split(',').map(s => s.trim());
    parts.pop();
    parts.push(upper);

    const newServiceString = parts.join(', ');
    setSearch(newServiceString);
    onChange(newServiceString);
    setIsOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
    const upper = search.toUpperCase();
    if (upper !== value) onChange(upper);
  };

  const openDropdown = (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
    const rect = e.target.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
    setIsOpen(true);
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <input
        type="text"
        value={search}
        onChange={e => {
          const upper = e.target.value.toUpperCase();
          setSearch(upper);
          openDropdown(e);
        }}
        onFocus={openDropdown}
        onBlur={handleBlur}
        className={INLINE_INPUT_STYLE}
      />
      {isOpen && filteredServices.length > 0 && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
          <div className="fixed bg-white border border-slate-200 shadow-2xl rounded-lg z-[101] overflow-hidden max-h-48 overflow-y-auto" style={{ top: coords.top, left: coords.left, width: coords.width }} onClick={e => e.stopPropagation()}>
            {filteredServices.map(service => (
              <div key={service} onMouseDown={(e) => { e.preventDefault(); handleSelect(service); }} className="px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 uppercase">
                {service}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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

export const ActiveQueue: React.FC<{
  repairs: VehicleRepair[]; isAdmin: boolean; currentUser: string; historicalServiceMap: Record<string, number>;
  onRefresh: () => void; onStatusChange: (id: number, status: string) => void; onAssignWorker: (id: number, workers: string) => void;
  onServiceChange: (id: number, service: string) => void; onDeleteClick: (id: number) => void; onViewDeepDive: (repair: VehicleRepair) => void; viewedRepairId?: number | null;
}> = ({ repairs, isAdmin, currentUser, historicalServiceMap, onRefresh, onStatusChange, onAssignWorker, onServiceChange, onDeleteClick, onViewDeepDive, viewedRepairId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const activeRepairs = repairs
    .filter(r => r.status !== 'COMPLETED')
    .filter(item => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (item.customerName?.toLowerCase().includes(lower) || item.vehicle?.licensePlate?.toLowerCase().includes(lower) || item.vehicle?.vin?.toLowerCase().includes(lower) || item.vehicle?.make?.toLowerCase().includes(lower) || item.vehicle?.model?.toLowerCase().includes(lower) || item.assignedWorker?.toLowerCase().includes(lower) || item.serviceType?.toLowerCase().includes(lower));
    }).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600';
      case 'IN_PROGRESS': return 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600';
      default: return 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600';
    }
  };

  return (
    <div className='space-y-6'>
      {isAdmin && <RepairForm onSuccess={onRefresh} currentUser={currentUser} isAdmin={isAdmin} historicalServiceMap={historicalServiceMap} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="text-2xl font-black text-amstar-blue">Shop Active Repairs</h2>
        <input type="text" placeholder="Search by name, VIN, plate..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={SEARCH_INPUT_STYLE} />
      </div>

      {activeRepairs.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">{searchTerm ? 'No active repairs match your search.' : 'No active repairs in the shop queue.'}</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3">Customer</th><th className="p-3">Vehicle Image</th>
                <th className="p-3">License Plate</th><th className="p-3">Vehicle Details</th><th className="p-3">VIN</th><th className="p-3">Service</th>
                <th className="p-3">Severity</th><th className="p-3">Entry Date</th><th className="p-3">Due Date</th><th className="p-3">Technician(s)</th><th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeRepairs.map((item, index) => (
                <tr key={item.id} onClick={() => isAdmin && onDeleteClick(item.id!)} className={`transition ${isAdmin ? 'hover:bg-red-50 cursor-pointer' : ''} ${viewedRepairId === item.id ? 'bg-sky-50' : index === 0 && !searchTerm ? 'bg-amber-50' : 'bg-white'}`} title={isAdmin ? 'Click to delete this repair' : ''}>
                  <td className="p-3 font-semibold text-slate-800">{item.customerName}</td>
                  <td className="p-3">{item.vehicle?.carImageUrl ? <img src={item.vehicle.carImageUrl} alt="Vehicle Image" onClick={e => { e.stopPropagation(); onViewDeepDive(item); }} className="w-16 h-10 object-cover rounded shadow-sm hover:scale-110 transition duration-200" /> : <span className="text-slate-400">No Image</span>}</td>

                  {/* === UPDATED: UNIFIED LICENSE PLATE DESIGN === */}
                  <td className="p-3">
                    <div className="inline-block border border-slate-300 bg-slate-50 px-2 py-1 rounded-md text-center font-bold shadow-sm min-w-[70px]">
                      {item.vehicle?.licensePlate}
                      <span className="text-[9px] block text-slate-500 leading-none mt-0.5">{item.vehicle?.state}</span>
                    </div>
                  </td>

                  <td className="p-3 font-medium text-slate-700">{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{item.vehicle?.vin || 'Unknown'}</td>

                  <td className="p-1">
                    {isAdmin ? (
                      <EditableServiceCell value={item.serviceType} historicalMap={historicalServiceMap} onChange={(newService) => onServiceChange(item.id!, newService)} />
                    ) : (
                      <span className="font-semibold text-slate-800 uppercase">{item.serviceType}</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-white text-[11px] shadow-sm ${getSeverityColor(item.severity)}`}>
                      Level {item.severity}
                    </span>
                  </td>

                  <td className="p-3 text-slate-500">{item.entryDate}</td>
                  <td className="p-3 font-semibold text-slate-700">{item.expectedCompletionDate}</td>

                  <td className="p-1" onClick={e => e.stopPropagation()}>
                    {isAdmin ? <MultiWorkerDropdown currentWorkers={item.assignedWorker} onAssign={(workers) => onAssignWorker(item.id!, workers)} /> : <span className="font-bold text-slate-700">{item.assignedWorker || 'Unassigned'}</span>}
                  </td>

                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    {isAdmin ? (
                      <select
                        value={item.status || 'PENDING'}
                        onChange={e => onStatusChange(item.id!, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/50 appearance-none text-center ${getStatusStyle(item.status)}`}
                      >
                        <option value="PENDING" className="bg-white text-slate-800">PENDING</option>
                        <option value="IN_PROGRESS" className="bg-white text-slate-800">IN PROGRESS</option>
                        <option value="COMPLETED" className="bg-white text-slate-800">COMPLETED</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${getStatusStyle(item.status)}`}>{item.status?.replace('_', ' ')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react';
import type { VehicleRepair } from '../types/repair';
import {
  SEARCH_INPUT_STYLE,
  INLINE_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  getStatusStyle,
} from '../styles/controls';
import { panelCoords } from '../lib/floating';
import { Truncated } from '../components/Truncated';
import { useTruncationTooltip } from '../lib/useTruncationTooltip';

const MultiWorkerDropdown: React.FC<{ currentWorkers: string | undefined; onAssign: (workers: string) => void; technicianNames: string[]; }> = ({ currentWorkers, onAssign, technicianNames }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const workersList = technicianNames;
  const selectedArray = currentWorkers ? currentWorkers.split(',').map(w => w.trim()).filter(w => w !== '') : [];

  const handleToggle = (workerName: string) => {
    let updatedSelection = selectedArray.includes(workerName) ? selectedArray.filter(w => w !== workerName) : [...selectedArray, workerName];
    onAssign(updatedSelection.join(', '));
  };
  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect();
    const { top, left } = panelCoords(rect, 226, 192);
    setCoords({ top, left });
    setIsOpen(true);
  };

  return (
    <>
      <div onClick={openDropdown} className={`${INLINE_INPUT_STYLE} group flex justify-between items-center min-w-[130px] max-w-[180px]`}>
        <Truncated
          value={selectedArray.length === 0 ? 'Unassigned' : selectedArray.join(', ')}
          className="flex-1"
          tapToReveal={false}
        />
        <span className="text-[10px] ml-2 text-amstar-ink-faint shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">▼</span>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className={`${FLOATING_PANEL_STYLE} w-48`} style={{ top: coords.top, left: coords.left }} onClick={e => e.stopPropagation()}>
            <div className={`${PANEL_HEADING_STYLE} bg-amstar-raised px-3 py-2 border-b border-amstar-line-soft text-[10px] font-black`}>Assign Technicians</div>
            <div className="max-h-48 overflow-y-auto p-1">
              {workersList.map(worker => (
                <label key={worker} className="flex items-center gap-3 px-2 py-2 hover:bg-amstar-surface rounded cursor-pointer transition">
                  <input type="checkbox" checked={selectedArray.includes(worker)} onChange={() => handleToggle(worker)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-amstar-line cursor-pointer" />
                  <span className="text-xs font-bold text-amstar-ink">{worker}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
};

const EditableServiceCell: React.FC<{ value: string; historicalMap: Record<string, number>; onChange: (val: string) => void; }> = ({ value, historicalMap, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setSearch(value || ''); }, [value]);

  const currentSegment = search.split(',').pop()?.trim() || '';

  const filteredServices = Object.keys(historicalMap).filter(service => service.toLowerCase().includes(currentSegment.toLowerCase()));

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
    setCoords(panelCoords(rect, 192, 200));
    setIsOpen(true);
  };

  const { anchorRef, handlers, tooltip, hide } =
    useTruncationTooltip<HTMLInputElement>(search, false);

  return (
    <>
      <input
        type="text"
        ref={anchorRef}
        value={search}
        onChange={e => {
          const upper = e.target.value.toUpperCase();
          setSearch(upper);
          openDropdown(e);
        }}
        onFocus={e => { hide(); openDropdown(e); }}
        onBlur={handleBlur}
        onMouseEnter={handlers.onMouseEnter}
        onMouseLeave={handlers.onMouseLeave}
        onClick={e => e.stopPropagation()}
        className={INLINE_INPUT_STYLE}
      />
      {tooltip}
      {isOpen && filteredServices.length > 0 && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className={`${FLOATING_PANEL_STYLE} max-h-48 overflow-y-auto`} style={{ top: coords.top, left: coords.left, width: coords.width }} onClick={e => e.stopPropagation()}>
            {filteredServices.map(service => (
              <div key={service} onMouseDown={(e) => { e.preventDefault(); handleSelect(service); }} className={`${PANEL_ROW_STYLE} uppercase`}>{service}</div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

// === NEW: UNIFIED STATUS DROPDOWN ===
const StatusDropdown: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const options = [
    { val: "PENDING", label: "PENDING" },
    { val: "IN_PROGRESS", label: "IN PROGRESS" },
    { val: "COMPLETED", label: "COMPLETED" }
  ];

  const currentLabel = options.find(o => o.val === value)?.label || value?.replace('_', ' ');

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords(panelCoords(rect, 3 * 38, 130));
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full min-w-[120px]">
      <div onClick={openDropdown} className={`px-3 py-1.5 rounded-sm text-xs font-bold cursor-pointer transition-all flex justify-between items-center border ${getStatusStyle(value)}`}>
        <span className="truncate flex-1 text-center">{currentLabel}</span>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className={FLOATING_PANEL_STYLE} style={{ top: coords.top, left: coords.left, width: coords.width }} onClick={e => e.stopPropagation()}>
            {options.map(opt => (
              <div
                key={opt.val}
                onClick={() => handleSelect(opt.val)}
                className={`${PANEL_ROW_STYLE} text-center`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const HistoryPage: React.FC<{
  repairs: VehicleRepair[]; historicalServiceMap: Record<string, number>;
  onStatusChange: (id: number, status: string) => void; onAssignWorker: (id: number, workers: string) => void; technicianNames: string[]; onServiceChange: (id: number, service: string) => void;
  onViewDeepDive: (repair: VehicleRepair) => void; onDeleteClick: (id: number) => void; viewedRepairId?: number | null;
}> = ({ repairs, historicalServiceMap, technicianNames, onStatusChange, onAssignWorker, onServiceChange, onViewDeepDive, onDeleteClick, viewedRepairId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const completedRepairs = repairs
    .filter(r => r.status === 'COMPLETED')
    .filter(item => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (item.customerName?.toLowerCase().includes(lower) || item.vehicle?.licensePlate?.toLowerCase().includes(lower) || item.vehicle?.vin?.toLowerCase().includes(lower) || item.vehicle?.make?.toLowerCase().includes(lower) || item.vehicle?.model?.toLowerCase().includes(lower) || item.assignedWorker?.toLowerCase().includes(lower) || item.serviceType?.toLowerCase().includes(lower));
    })
    .sort((a, b) => new Date(b.actualCompletionDate || b.expectedCompletionDate).getTime() - new Date(a.actualCompletionDate || a.expectedCompletionDate).getTime());

  const calculateTotal = (item: VehicleRepair) => ((item.includeRetail ? item.retailPrice || 0 : 0) + (item.includeLease ? item.leasePrice || 0 : 0) + (item.includeLabor ? item.laborPrice || 0 : 0));


  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4'>
        <h2 className='font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink'>Completed Services Ledger</h2>
        <input type='text' placeholder='Search history by name, VIN, plate...' value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={SEARCH_INPUT_STYLE} />
      </div>

      {completedRepairs.length === 0 ? (
        <div className={`${PANEL_STYLE} border-dashed p-8 text-center text-amstar-ink-dim`}>{searchTerm ? 'No completed repairs match your search.' : 'No completed services recorded yet.'}</div>
      ) : (
        <div className={`${PANEL_STYLE} overflow-x-auto`}>
          <table className='w-full text-left text-xs border-collapse'>
            <thead className='bg-amstar-raised border-b border-amstar-line'>
              <tr>
                <th className={`${PANEL_HEADING_STYLE} p-3 hidden lg:table-cell`}>Entry Date</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Completion Date</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Customer</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Vehicle Image</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>License Plate</th>
                <th className={`${PANEL_HEADING_STYLE} p-3 hidden md:table-cell`}>Vehicle Details</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Service Details</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Technician(s)</th>
                <th className={`${PANEL_HEADING_STYLE} p-3`}>Total Price</th>
                <th className={`${PANEL_HEADING_STYLE} p-3 text-center`}>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-amstar-line-soft'>
              {completedRepairs.map(item => (
                <tr key={item.id} onClick={() => onDeleteClick(item.id!)} className={`hover:bg-amstar-red/20 transition cursor-pointer group ${viewedRepairId === item.id ? 'bg-amstar-raised' : 'bg-amstar-surface'}`} title='Click to delete this ticket'>
                  <td className='p-3 font-mono tabular-nums text-amstar-ink-dim hidden lg:table-cell'>{item.entryDate}</td>
                  <td className='p-3 font-bold font-mono tabular-nums text-amstar-ink'>{item.actualCompletionDate || item.expectedCompletionDate}</td>
                  <td className='p-3 font-semibold text-amstar-ink'>{item.customerName}</td>
                  <td className='p-3'>{item.vehicle?.carImageUrl ? <img src={item.vehicle.carImageUrl} alt='Vehicle Image' onClick={e => { e.stopPropagation(); onViewDeepDive(item); }} className='w-16 h-10 object-cover rounded shadow-sm hover:scale-110 transition duration-200' /> : <span className='text-amstar-ink-faint'>No Image</span>}</td>

                  <td className="p-3">
                    <div className="inline-block border border-amstar-line bg-amstar-raised px-2 py-1 rounded-md text-center font-bold font-mono tabular-nums shadow-sm min-w-[70px]">
                      {item.vehicle?.licensePlate}
                      <span className="text-[9px] block text-amstar-ink-dim leading-none mt-0.5">{item.vehicle?.state}</span>
                    </div>
                  </td>

                  <td className='p-3 font-medium text-amstar-ink hidden md:table-cell'>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</td>

                  <td className='p-1' title="" onClick={e => e.stopPropagation()}>
                    <EditableServiceCell value={item.serviceType} historicalMap={historicalServiceMap} onChange={(newService) => onServiceChange(item.id!, newService)} />
                  </td>

                  <td className='p-1' title="" onClick={e => e.stopPropagation()}>
                    <MultiWorkerDropdown currentWorkers={item.assignedWorker} technicianNames={technicianNames} onAssign={(workers) => onAssignWorker(item.id!, workers)} />
                  </td>

                  <td className='p-3 font-black text-emerald-400 text-sm'>${calculateTotal(item).toFixed(2)}</td>

                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <StatusDropdown value={item.status || 'PENDING'} onChange={(val) => onStatusChange(item.id!, val)} />
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

import React, { useState, useEffect, useRef } from 'react';

import {
  SHARED_INPUT_STYLE,
  FLOATING_PANEL_STYLE,
  PANEL_ROW_STYLE,
  LABEL_STYLE,
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
} from '../styles/controls';
import { API_BASE } from '../config';

// === NEW: CUSTOM DATE PICKER ===
const CustomDatePicker: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [currentView, setCurrentView] = useState(new Date());

  const handleOpen = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left });
    if (value) {
      const [y, m] = value.split('-');
      setCurrentView(new Date(parseInt(y), parseInt(m) - 1, 1));
    } else {
      setCurrentView(new Date());
    }
    setIsOpen(true);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const year = currentView.getFullYear();
    const month = String(currentView.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(currentView.getFullYear(), currentView.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentView.getFullYear(), currentView.getMonth(), 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDay }, (_, i) => i);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  let displayValue = '';
  if (value) {
    const [y, m, d] = value.split('-');
    displayValue = `${m}/${d}/${y}`;
  }

  return (
    <div className="relative w-full">
      {/* Hidden input to maintain HTML5 'required' validation */}
      <input type="text" readOnly required value={value} className="absolute opacity-0 w-0 h-0 -z-10" />

      <div onClick={handleOpen} className={`${SHARED_INPUT_STYLE} flex justify-between items-center cursor-pointer ${!value ? 'text-amstar-ink-faint' : 'text-amstar-ink font-bold'}`}>
        <span className="truncate">{displayValue || "Select Date..."}</span>
        <svg className="w-4 h-4 text-amstar-ink-faint shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className={`${FLOATING_PANEL_STYLE} p-4 w-64 select-none`} style={{ top: coords.top, left: coords.left }} onClick={e => e.stopPropagation()}>

            <div className="flex justify-between items-center mb-4 px-1">
              <button type="button" onClick={handlePrevMonth} className="w-6 h-6 flex items-center justify-center hover:bg-amstar-surface rounded text-amstar-ink-dim font-black transition-colors">{"<"}</button>
              <span className="text-sm font-black text-amstar-ink">{monthNames[currentView.getMonth()]} {currentView.getFullYear()}</span>
              <button type="button" onClick={handleNextMonth} className="w-6 h-6 flex items-center justify-center hover:bg-amstar-surface rounded text-amstar-ink-dim font-black transition-colors">{">"}</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <span key={d} className="text-[10px] font-black text-amstar-ink-faint uppercase">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {blanksArray.map(b => <div key={`blank-${b}`} className="w-7 h-7"></div>)}
              {daysArray.map(day => {
                const isSelected = value === `${currentView.getFullYear()}-${String(currentView.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const today = new Date();
                const isToday = today.getDate() === day && today.getMonth() === currentView.getMonth() && today.getFullYear() === currentView.getFullYear();

                return (
                  <div
                    key={day}
                    onClick={() => handleSelectDate(day)}
                    className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-xs font-bold cursor-pointer transition-colors
                      ${isSelected ? 'bg-amstar-blue text-white shadow-md' : isToday ? 'text-amstar-ink bg-amstar-raised border border-amstar-red/50' : 'text-amstar-ink hover:bg-amstar-surface'}
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

          </div>
        </>
      )}
    </div>
  );
};

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Minor',
  2: 'Low',
  3: 'Moderate',
  4: 'Major',
  5: 'Critical',
};

const SeveritySegments: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const levels = [1, 2, 3, 4, 5];
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Derive from the CURRENT value, not the pressed button's own level, and move
  // DOM focus to the newly selected segment. Without the focus move the same
  // button keeps receiving keydown, and selection never advances past one step.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = Math.min(5, value + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = Math.max(1, value - 1);
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = 5;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next === value) return;
    onChange(next);
    btnRefs.current[next - 1]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Severity Level" className="flex gap-1.5">
      {levels.map(level => {
        const selected = value === level;
        return (
          <button
            key={level}
            ref={el => { btnRefs.current[level - 1] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Level ${level} - ${SEVERITY_LABELS[level]}`}
            title={`Level ${level} - ${SEVERITY_LABELS[level]}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={handleKeyDown}
            className={`flex-1 min-h-[44px] rounded font-cond text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amstar-red/40 ${selected
              ? 'text-white border border-amstar-red bg-amstar-red/[0.16] shadow-[inset_0_0_12px_rgba(214,32,39,0.35)]'
              : 'text-amstar-ink-faint border border-amstar-line hover:border-amstar-red/60'
              }`}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
};

const ServiceAutocomplete: React.FC<{
  value: string;
  onChange: (val: string) => void;
  historicalMap: Record<string, number>;
  onAutoSetSeverity: (severity: number) => void;
}> = ({ value, onChange, historicalMap, onAutoSetSeverity }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => { setSearch(value); }, [value]);

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
    if (historicalMap[upper]) onAutoSetSeverity(historicalMap[upper]);
    setIsOpen(false);
  };

  const openDropdown = (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
    const rect = e.target.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setIsOpen(true);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); openDropdown(e); }}
        onFocus={openDropdown}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder="e.g. OIL CHANGE, TIRE ROTATION"
        className={SHARED_INPUT_STYLE}
        required
      />
      {isOpen && filteredServices.length > 0 && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className={`${FLOATING_PANEL_STYLE} max-h-48 overflow-y-auto`} style={{ top: coords.top, left: coords.left, width: coords.width }}>
            {filteredServices.map(service => (
              <div key={service} onMouseDown={(e) => { e.preventDefault(); handleSelect(service); }} className={`${PANEL_ROW_STYLE} uppercase`}>
                {service}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const US_STATES: Record<string, string> = { "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia" };

const StateSearch: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => { setSearch(value); }, [value]);
  const filteredStates = Object.entries(US_STATES).filter(([abbr, name]) => abbr.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase()));
  const handleSelect = (abbr: string) => { setSearch(abbr); onChange(abbr); setIsOpen(false); };
  const handleBlur = () => {
    setIsOpen(false);
    const cleanSearch = search.trim().toLowerCase();
    const exactMatch = Object.entries(US_STATES).find(([abbr, name]) => name.toLowerCase() === cleanSearch || abbr.toLowerCase() === cleanSearch);
    if (exactMatch) { setSearch(exactMatch[0]); onChange(exactMatch[0]); }
    else { const fallback = cleanSearch.substring(0, 2).toUpperCase(); setSearch(fallback); onChange(fallback); }
  };
  const openDropdown = (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
    const rect = e.target.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 192) });
    setIsOpen(true);
  };
  return (
    <div className="relative w-24 shrink-0">
      <label className={LABEL_STYLE}>State</label>
      <input type="text" value={search} onChange={e => { setSearch(e.target.value); openDropdown(e); }} onFocus={openDropdown} onBlur={handleBlur} placeholder="MD" className={`${SHARED_INPUT_STYLE} text-center font-bold uppercase tabular-nums`} />
      {isOpen && filteredStates.length > 0 && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className={`${FLOATING_PANEL_STYLE} max-h-48 overflow-y-auto`} style={{ top: coords.top, left: coords.left, width: coords.width }} onClick={e => e.stopPropagation()}>
            {filteredStates.map(([abbr, name]) => (
              <div key={abbr} onMouseDown={(e) => { e.preventDefault(); handleSelect(abbr); }} className={`${PANEL_ROW_STYLE} flex justify-between items-center`}>
                <span className="truncate">{name}</span><span className="text-amstar-ink-dim ml-2 shrink-0">{abbr}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const FormWorkerDropdown: React.FC<{ currentWorkers: string; onAssign: (workers: string) => void; technicianNames: string[]; }> = ({ currentWorkers, onAssign, technicianNames }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const workersList = technicianNames;
  const selectedArray = currentWorkers ? currentWorkers.split(',').map(w => w.trim()).filter(w => w !== '') : [];
  const handleToggle = (workerName: string) => {
    let updatedSelection = selectedArray.includes(workerName) ? selectedArray.filter(w => w !== workerName) : [...selectedArray, workerName];
    onAssign(updatedSelection.join(', '));
  };
  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setCoords({ top: rect.bottom + 4, left: rect.left }); setIsOpen(true);
  };
  return (
    <>
      <div onClick={openDropdown} className={`${SHARED_INPUT_STYLE} flex justify-between items-center cursor-pointer`}>
        <span className="truncate" title={selectedArray.length === 0 ? 'Select technicians...' : selectedArray.join(', ')}>
          {selectedArray.length === 0 ? <span className="text-amstar-ink-faint">Select technicians...</span> : selectedArray.join(', ')}
        </span>
        <span className="text-xs ml-2 text-amstar-ink-faint shrink-0">▼</span>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className={`${FLOATING_PANEL_STYLE} w-64`} style={{ top: coords.top, left: coords.left }} onClick={e => e.stopPropagation()}>
            <div className={`${PANEL_HEADING_STYLE} bg-amstar-raised px-3 py-2 border-b border-amstar-line-soft text-[10px] font-black`}>Assign Technicians</div>
            <div className="max-h-48 overflow-y-auto p-1">
              {workersList.map(worker => (
                <label key={worker} className="flex items-center gap-3 px-3 py-2 hover:bg-amstar-surface rounded-sm cursor-pointer transition">
                  <input type="checkbox" checked={selectedArray.includes(worker)} onChange={() => handleToggle(worker)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-amstar-line cursor-pointer" />
                  <span className="text-sm font-bold text-amstar-ink">{worker}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

interface RepairFormProps { onSuccess: () => void; currentUser: string; isAdmin: boolean; historicalServiceMap: Record<string, number>; technicianNames: string[]; }

export const RepairForm: React.FC<RepairFormProps> = ({ onSuccess, isAdmin, historicalServiceMap, technicianNames }) => {
  const [customerName, setCustomerName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleState, setVehicleState] = useState('MD');
  const [serviceType, setServiceType] = useState('');
  const [severity, setSeverity] = useState<number>(3);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [assignedWorkers, setAssignedWorkers] = useState<string>('');
  const [vin, setVin] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsSubmitting(true);
    let finalMake = "Unknown", finalModel = "Vehicle", finalYear = new Date().getFullYear(), finalImageUrl = "";

    if (vin && vin.length === 17) {
      try {
        const nhtsaResponse = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
        const nhtsaData = await nhtsaResponse.json();
        const vehicleInfo = nhtsaData.Results[0];
        if (vehicleInfo.Make && vehicleInfo.Model) {
          finalMake = vehicleInfo.Make; finalModel = vehicleInfo.Model; finalYear = Number(vehicleInfo.ModelYear) || finalYear;
          const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(finalMake + ' ' + finalModel)}&limit=1&format=json&origin=*`;
          const searchResponse = await fetch(searchUrl);
          const searchData = await searchResponse.json();
          if (searchData[1] && searchData[1].length > 0) {
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchData[1][0])}`;
            const summaryResponse = await fetch(summaryUrl);
            const summaryData = await summaryResponse.json();
            if (summaryData.originalimage?.source) finalImageUrl = summaryData.originalimage.source;
            else if (summaryData.thumbnail?.source) finalImageUrl = summaryData.thumbnail.source;
          }
        }
      } catch { console.warn("Background decoding failed."); }
    }

    const payload = {
      customerName, serviceType, severity, entryDate: new Date().toISOString().split('T')[0], expectedCompletionDate, assignedWorker: isAdmin ? assignedWorkers : '', status: 'PENDING',
      vehicle: { vin: vin || null, licensePlate, state: vehicleState, make: finalMake, model: finalModel, year: finalYear, carImageUrl: finalImageUrl }
    };

    try {
      const response = await fetch(`${API_BASE}/api/repairs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('amstar_token')}` }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Failed to submit repair ticket');
      setCustomerName(''); setVin(''); setLicensePlate(''); setServiceType(''); setSeverity(3); setExpectedCompletionDate('');
      if (isAdmin) setAssignedWorkers('');
      onSuccess();
    } catch { setError('Failed to submit. Ensure you are logged in and the server is running.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className={`${PANEL_STYLE} p-6 mb-8 overflow-visible`}>
      <h3 className="mt-0 border-b border-amstar-line-soft pb-3 mb-4 font-cond text-lg font-bold uppercase tracking-wider text-amstar-ink">New Vehicle Intake</h3>
      {error && <div className="text-white bg-amstar-red/20 border border-amstar-red p-3 rounded-lg mb-4 text-sm font-bold">{error}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div><label className={LABEL_STYLE}>Customer Name</label><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required className={SHARED_INPUT_STYLE} /></div>
        <div><label className={LABEL_STYLE}>VIN (17-Digits)</label><input type="text" value={vin} onChange={e => setVin(e.target.value.toUpperCase())} maxLength={17} placeholder='e.g. 1G1RC...' className={`${SHARED_INPUT_STYLE} font-mono tabular-nums`} /></div>
        <div className="flex gap-3"><div className="flex-1"><label className={LABEL_STYLE}>Plate</label><input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required className={`${SHARED_INPUT_STYLE} tabular-nums`} /></div><StateSearch value={vehicleState} onChange={setVehicleState} /></div>

        <div>
          <label className={LABEL_STYLE}>Service Required</label>
          <ServiceAutocomplete value={serviceType} onChange={setServiceType} historicalMap={historicalServiceMap} onAutoSetSeverity={setSeverity} />
        </div>

        <div>
          <label className={LABEL_STYLE}>Severity Level</label>
          <SeveritySegments value={severity} onChange={setSeverity} />
        </div>

        {/* === REPLACED NATIVE DATE WITH CUSTOM COMPONENT === */}
        <div>
          <label className={LABEL_STYLE}>Target Completion</label>
          <CustomDatePicker value={expectedCompletionDate} onChange={setExpectedCompletionDate} />
        </div>

        {isAdmin && (
          <div className="md:col-span-2">
            <label className={LABEL_STYLE}>Assign Technician(s) <span className="font-normal text-xs text-amstar-ink-faint ml-2 normal-case tracking-normal">(Optional)</span></label>
            <div className="relative"><FormWorkerDropdown currentWorkers={assignedWorkers} technicianNames={technicianNames} onAssign={setAssignedWorkers} /></div>
          </div>
        )}
        <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2 pt-5 border-t border-amstar-line-soft"><button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-amstar-red hover:bg-red-700 text-white rounded-sm font-cond uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition-all font-bold disabled:opacity-70 disabled:cursor-not-allowed">{isSubmitting ? 'Decoding VIN & Submitting...' : 'Add Vehicle to Queue'}</button></div>
      </form>
    </div>
  );
};

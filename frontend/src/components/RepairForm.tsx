import React, { useState, useEffect } from 'react';

const SHARED_INPUT_STYLE = "w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 shadow-sm transition-all focus:outline-none focus:border-amstar-blue focus:ring-2 focus:ring-amstar-blue/20";

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

      <div onClick={handleOpen} className={`${SHARED_INPUT_STYLE} flex justify-between items-center cursor-pointer ${!value ? 'text-slate-400' : 'text-slate-800 font-bold'}`}>
        <span className="truncate">{displayValue || "Select Date..."}</span>
        <svg className="w-4 h-4 text-slate-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className="fixed bg-white border border-slate-200 shadow-2xl rounded-xl z-[101] overflow-hidden p-4 w-64 select-none" style={{ top: coords.top, left: coords.left }} onClick={e => e.stopPropagation()}>

            <div className="flex justify-between items-center mb-4 px-1">
              <button type="button" onClick={handlePrevMonth} className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded text-slate-500 font-black transition-colors">{"<"}</button>
              <span className="text-sm font-black text-amstar-blue">{monthNames[currentView.getMonth()]} {currentView.getFullYear()}</span>
              <button type="button" onClick={handleNextMonth} className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded text-slate-500 font-black transition-colors">{">"}</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <span key={d} className="text-[10px] font-black text-slate-400 uppercase">{d}</span>
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
                      ${isSelected ? 'bg-amstar-blue text-white shadow-md' : isToday ? 'text-amstar-blue bg-blue-50 border border-blue-200' : 'text-slate-700 hover:bg-slate-100'}
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

const SeverityDropdown: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const options = [
    { val: 1, label: "Level 1 - Low", color: "bg-emerald-500" },
    { val: 2, label: "Level 2 - Minor", color: "bg-blue-500" },
    { val: 3, label: "Level 3 - Standard", color: "bg-amber-500" },
    { val: 4, label: "Level 4 - Major/Urgent", color: "bg-orange-500" },
    { val: 5, label: "Level 5 - Critical", color: "bg-red-600" }
  ];

  const currentOption = options.find(o => o.val === value);

  const openDropdown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setIsOpen(true);
  };

  const handleSelect = (val: number) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div onClick={openDropdown} className={`${SHARED_INPUT_STYLE} flex justify-between items-center cursor-pointer font-bold`}>
        <span className="truncate flex items-center gap-2.5">
          {currentOption ? (
            <>
              <span className={`w-2.5 h-2.5 rounded-full ${currentOption.color} shrink-0 shadow-sm`}></span>
              {currentOption.label}
            </>
          ) : "Select Level..."}
        </span>
        <span className="text-xs ml-2 text-slate-400 shrink-0">▼</span>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className="fixed bg-white border border-slate-200 shadow-2xl rounded-lg z-[101] overflow-hidden" style={{ top: coords.top, left: coords.left, width: coords.width }} onClick={e => e.stopPropagation()}>
            {options.map(opt => (
              <div
                key={opt.val}
                onClick={() => handleSelect(opt.val)}
                className="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex items-center gap-2.5"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${opt.color} shrink-0 shadow-sm`}></span>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
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
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
          <div className="fixed bg-white border border-slate-200 shadow-2xl rounded-lg z-[101] overflow-hidden max-h-48 overflow-y-auto" style={{ top: coords.top, left: coords.left, width: coords.width }}>
            {filteredServices.map(service => (
              <div key={service} onMouseDown={(e) => { e.preventDefault(); handleSelect(service); }} className="px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
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
  return (
    <div className="relative w-24 shrink-0">
      <label className="block text-sm font-bold text-slate-600 mb-1">State</label>
      <input type="text" value={search} onChange={e => { setSearch(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} onBlur={handleBlur} placeholder="MD" className={`${SHARED_INPUT_STYLE} text-center font-bold uppercase`} />
      {isOpen && filteredStates.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-48 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] overflow-hidden">
          {filteredStates.map(([abbr, name]) => (
            <div key={abbr} onMouseDown={(e) => { e.preventDefault(); handleSelect(abbr); }} className="px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors">
              <span className="truncate">{name}</span><span className="text-amstar-blue ml-2 shrink-0">{abbr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FormWorkerDropdown: React.FC<{ currentWorkers: string; onAssign: (workers: string) => void; }> = ({ currentWorkers, onAssign }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const workersList = ["Technician 1", "Technician 2", "Technician 3"];
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
          {selectedArray.length === 0 ? <span className="text-slate-400">Select technicians...</span> : selectedArray.join(', ')}
        </span>
        <span className="text-xs ml-2 text-slate-400 shrink-0">▼</span>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} onWheel={() => setIsOpen(false)} onTouchMove={() => setIsOpen(false)}></div>
          <div className="fixed bg-white border border-slate-200 shadow-2xl rounded-lg z-[101] overflow-hidden w-64" style={{ top: coords.top, left: coords.left }} onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">Assign Technicians</div>
            <div className="max-h-48 overflow-y-auto p-1">
              {workersList.map(worker => (
                <label key={worker} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded cursor-pointer transition">
                  <input type="checkbox" checked={selectedArray.includes(worker)} onChange={() => handleToggle(worker)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-slate-300 cursor-pointer" />
                  <span className="text-sm font-bold text-slate-700">{worker}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

interface RepairFormProps { onSuccess: () => void; currentUser: string; isAdmin: boolean; historicalServiceMap: Record<string, number>; }

export const RepairForm: React.FC<RepairFormProps> = ({ onSuccess, currentUser, isAdmin, historicalServiceMap }) => {
  const [customerName, setCustomerName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleState, setVehicleState] = useState('MD');
  const [serviceType, setServiceType] = useState('');
  const [severity, setSeverity] = useState<number>(3);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [assignedWorkers, setAssignedWorkers] = useState<string>('');
  const [vin, setVin] = useState('');

  useEffect(() => { if (!isAdmin && currentUser) setAssignedWorkers(currentUser); }, [currentUser, isAdmin]);

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
      } catch (err) { console.warn("Background decoding failed."); }
    }

    const payload = {
      customerName, serviceType, severity, entryDate: new Date().toISOString().split('T')[0], expectedCompletionDate, assignedWorker: isAdmin ? assignedWorkers : currentUser, status: 'PENDING',
      vehicle: { vin: vin || "Unknown", licensePlate, state: vehicleState, make: finalMake, model: finalModel, year: finalYear, carImageUrl: finalImageUrl }
    };

    try {
      const response = await fetch('http://localhost:8080/api/repairs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('amstar_token')}` }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Failed to submit repair ticket');
      setCustomerName(''); setVin(''); setLicensePlate(''); setServiceType(''); setSeverity(3); setExpectedCompletionDate('');
      if (isAdmin) setAssignedWorkers('');
      onSuccess();
    } catch (err) { setError('Failed to submit. Ensure you are logged in and the server is running.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 overflow-visible">
      <h3 className="mt-0 border-b border-slate-100 pb-3 mb-4 text-lg font-bold text-amstar-blue">New Vehicle Intake</h3>
      {error && <div className="text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg mb-4 text-sm font-bold">{error}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div><label className="block text-sm font-bold text-slate-600 mb-1">Customer Name</label><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required className={SHARED_INPUT_STYLE} /></div>
        <div><label className="block text-sm font-bold text-slate-600 mb-1">VIN (17-Digits)</label><input type="text" value={vin} onChange={e => setVin(e.target.value.toUpperCase())} maxLength={17} placeholder='e.g. 1G1RC...' className={`${SHARED_INPUT_STYLE} font-mono`} /></div>
        <div className="flex gap-3"><div className="flex-1"><label className="block text-sm font-bold text-slate-600 mb-1">Plate</label><input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required className={SHARED_INPUT_STYLE} /></div><StateSearch value={vehicleState} onChange={setVehicleState} /></div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-1">Service Required</label>
          <ServiceAutocomplete value={serviceType} onChange={setServiceType} historicalMap={historicalServiceMap} onAutoSetSeverity={setSeverity} />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-1">Severity Level</label>
          <SeverityDropdown value={severity} onChange={setSeverity} />
        </div>

        {/* === REPLACED NATIVE DATE WITH CUSTOM COMPONENT === */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-1">Target Completion</label>
          <CustomDatePicker value={expectedCompletionDate} onChange={setExpectedCompletionDate} />
        </div>

        {isAdmin && (
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-600 mb-1">Assign Technician(s) <span className="font-normal text-xs text-slate-400 ml-2">(Optional)</span></label>
            <div className="relative"><FormWorkerDropdown currentWorkers={assignedWorkers} onAssign={setAssignedWorkers} /></div>
          </div>
        )}
        <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2 pt-5 border-t border-slate-100"><button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-amstar-red hover:bg-red-700 text-white rounded-lg shadow-md transition-all font-bold disabled:opacity-70 disabled:cursor-not-allowed">{isSubmitting ? 'Decoding VIN & Submitting...' : 'Add Vehicle to Queue'}</button></div>
      </form>
    </div>
  );
};

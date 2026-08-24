import React, { useState } from 'react';
import type { VehicleRepair } from '../types/repair';
import { SEARCH_INPUT_STYLE, NUMBER_INPUT_STYLE, PANEL_STYLE, LABEL_STYLE } from '../styles/controls';

const PricingCard: React.FC<{
  item: VehicleRepair;
  onSavePricing: (id: number, payload: any) => void;
}> = ({ item, onSavePricing }) => {
  const [retailPrice, setRetailPrice] = useState<number>(item.retailPrice || 0);
  const [leasePrice, setLeasePrice] = useState<number>(item.leasePrice || 0);
  const [laborPrice, setLaborPrice] = useState<number>(item.laborPrice || 0);

  const [includeRetail, setIncludeRetail] = useState<boolean>(item.includeRetail || false);
  const [includeLease, setIncludeLease] = useState<boolean>(item.includeLease || false);
  const [includeLabor, setIncludeLabor] = useState<boolean>(item.includeLabor || false);

  const [isSaving, setIsSaving] = useState(false);

  const currentTotal =
    (includeRetail ? retailPrice : 0) +
    (includeLease ? leasePrice : 0) +
    (includeLabor ? laborPrice : 0);

  const handleSave = async () => {
    setIsSaving(true);
    await onSavePricing(item.id!, {
      retailPrice,
      leasePrice,
      laborPrice,
      includeRetail,
      includeLease,
      includeLabor,
    });
    // Small delay to let the UI feel like it "did work" before resetting button state
    setTimeout(() => setIsSaving(false), 400);
  };

  // Helper for dynamic row styling
  const getRowStyle = (isActive: boolean) =>
    `flex items-center justify-between text-sm p-3 rounded border transition-all duration-200 ${isActive
      ? 'bg-amstar-raised border-amstar-red/40 shadow-inner'
      : 'bg-amstar-field border-amstar-line shadow-sm hover:border-amstar-red/60'
    }`;

  return (
    <div className={`${PANEL_STYLE} overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col md:flex-row h-full`}>

      {/* Left Side: Vehicle Info */}
      <div className="p-5 flex-1 border-b md:border-b-0 md:border-r border-amstar-line-soft flex flex-col gap-3">
        {item.vehicle?.carImageUrl ? (
          <img src={item.vehicle.carImageUrl} alt="Vehicle" className="w-full h-36 object-cover rounded shadow-sm" />
        ) : (
          <div className="w-full h-36 bg-amstar-field flex items-center justify-center rounded border border-dashed border-amstar-line text-amstar-ink-faint text-xs font-bold tracking-widest uppercase">
            No Image
          </div>
        )}

        <div className="mt-1">
          <h3 className="font-cond text-lg font-bold uppercase tracking-wider text-amstar-ink leading-tight">
            {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}
          </h3>
          <p className="text-xs text-amstar-ink-dim font-bold mt-1">{item.serviceType}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-amstar-line-soft mt-auto">
          <div>
            <span className={LABEL_STYLE}>VIN</span>
            <span className="font-mono tabular-nums bg-amstar-field px-2 py-1 rounded-md text-amstar-ink shadow-inner border border-amstar-line block truncate">{item.vehicle?.vin || 'N/A'}</span>
          </div>
          <div>
            <span className={LABEL_STYLE}>License Plate</span>
            <div className="inline-block border border-amstar-line bg-amstar-raised px-2 py-1 rounded-md text-center font-bold font-mono tabular-nums shadow-sm">
              {item.vehicle?.licensePlate} <span className="text-[9px] block text-amstar-ink-dim leading-none">{item.vehicle?.state}</span>
            </div>
          </div>
        </div>

        <div className="text-xs mt-1">
          <span className={LABEL_STYLE}>Technician(s)</span>
          <span className="font-bold text-amstar-ink">{item.assignedWorker || 'Unassigned'}</span>
        </div>
      </div>

      {/* Right Side: Interactive Pricing Controls */}
      <div className="p-5 flex-1 bg-amstar-ground/40 flex flex-col justify-between space-y-5">

        <div className="space-y-3">
          <h4 className="font-cond text-xs font-black uppercase tracking-widest text-amstar-ink-dim mb-4">Invoice Breakdown</h4>

          <label className={getRowStyle(includeRetail)}>
            <span className="flex items-center gap-3 font-bold text-amstar-ink cursor-pointer">
              <input type="checkbox" checked={includeRetail} onChange={e => setIncludeRetail(e.target.checked)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-amstar-line cursor-pointer transition-all" />
              Retail Price
            </span>
            <div className="flex items-center gap-1.5 font-black text-amstar-ink-dim">
              <span className={includeRetail ? 'text-amstar-ink' : 'text-amstar-ink-faint'}>$</span>
              <input
                type="number"
                disabled={!includeRetail}
                value={retailPrice === 0 ? '' : retailPrice}
                onChange={e => setRetailPrice(Number(e.target.value))}
                placeholder="0.00"
                className={NUMBER_INPUT_STYLE}
              />
            </div>
          </label>

          <label className={getRowStyle(includeLease)}>
            <span className="flex items-center gap-3 font-bold text-amstar-ink cursor-pointer">
              <input type="checkbox" checked={includeLease} onChange={e => setIncludeLease(e.target.checked)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-amstar-line cursor-pointer transition-all" />
              Lease Price
            </span>
            <div className="flex items-center gap-1.5 font-black text-amstar-ink-dim">
              <span className={includeLease ? 'text-amstar-ink' : 'text-amstar-ink-faint'}>$</span>
              <input
                type="number"
                disabled={!includeLease}
                value={leasePrice === 0 ? '' : leasePrice}
                onChange={e => setLeasePrice(Number(e.target.value))}
                placeholder="0.00"
                className={NUMBER_INPUT_STYLE}
              />
            </div>
          </label>

          <label className={getRowStyle(includeLabor)}>
            <span className="flex items-center gap-3 font-bold text-amstar-ink cursor-pointer">
              <input type="checkbox" checked={includeLabor} onChange={e => setIncludeLabor(e.target.checked)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-amstar-line cursor-pointer transition-all" />
              Labor Price
            </span>
            <div className="flex items-center gap-1.5 font-black text-amstar-ink-dim">
              <span className={includeLabor ? 'text-amstar-ink' : 'text-amstar-ink-faint'}>$</span>
              <input
                type="number"
                disabled={!includeLabor}
                value={laborPrice === 0 ? '' : laborPrice}
                onChange={e => setLaborPrice(Number(e.target.value))}
                placeholder="0.00"
                className={NUMBER_INPUT_STYLE}
              />
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-amstar-line-soft flex items-center justify-between mt-auto">
          <div>
            <span className={LABEL_STYLE}>Total Billed</span>
            <span className="font-mono tabular-nums text-3xl font-black text-emerald-400 tracking-tight">${currentTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-amstar-red hover:bg-red-700 text-white rounded-sm text-sm font-cond uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Pricing'}
          </button>
        </div>

      </div>

    </div>
  );
};

export const PricingPage: React.FC<{
  repairs: VehicleRepair[];
  onSavePricing: (id: number, payload: any) => void;
}> = ({ repairs, onSavePricing }) => {

  const [searchTerm, setSearchTerm] = useState('');

  // Filter repairs by search term
  const filteredRepairs = repairs
    .filter(item => {
      if (!searchTerm) return true;
      const lower = searchTerm.toLowerCase();
      return (
        item.customerName?.toLowerCase().includes(lower) ||
        item.vehicle?.licensePlate?.toLowerCase().includes(lower) ||
        item.vehicle?.vin?.toLowerCase().includes(lower) ||
        item.vehicle?.make?.toLowerCase().includes(lower) ||
        item.vehicle?.model?.toLowerCase().includes(lower) ||
        item.assignedWorker?.toLowerCase().includes(lower) ||
        item.serviceType?.toLowerCase().includes(lower)
      );
    })
    // Optional: Sort by active first, then completed
    .sort((a, b) => {
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      return (b.id || 0) - (a.id || 0);
    });

  return (
    <div className="space-y-6">

      {/* Header & Unified Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">Pricing & Invoice Calculator</h2>
        <input
          type="text"
          placeholder="Search by name, VIN, plate, vehicle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={SEARCH_INPUT_STYLE}
        />
      </div>

      {filteredRepairs.length === 0 ? (
        <div className={`${PANEL_STYLE} border-dashed p-12 text-center text-amstar-ink-dim font-medium`}>
          {searchTerm ? 'No vehicles match your search.' : 'No vehicles in the system to price.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRepairs.map(item => (
            <PricingCard key={item.id} item={item} onSavePricing={onSavePricing} />
          ))}
        </div>
      )}

    </div>
  );
};

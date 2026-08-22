import React, { useState } from 'react';
import type { VehicleRepair } from '../types/repair';

// === UNIFIED DESIGN SYSTEM STYLES ===
const SEARCH_INPUT_STYLE = "w-full sm:w-80 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 shadow-sm transition-all focus:outline-none focus:border-amstar-blue focus:ring-2 focus:ring-amstar-blue/20";
const NUMBER_INPUT_STYLE = "w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 shadow-sm transition-all text-right focus:outline-none focus:border-amstar-blue focus:ring-2 focus:ring-amstar-blue/20 disabled:opacity-40 disabled:bg-slate-100 disabled:cursor-not-allowed";

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
    `flex items-center justify-between text-sm p-3 rounded-xl border transition-all duration-200 ${isActive
      ? 'bg-blue-50/40 border-amstar-blue/30 shadow-inner'
      : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
    }`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col md:flex-row h-full">

      {/* Left Side: Vehicle Info */}
      <div className="p-5 flex-1 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col gap-3">
        {item.vehicle?.carImageUrl ? (
          <img src={item.vehicle.carImageUrl} alt="Vehicle" className="w-full h-36 object-cover rounded-xl shadow-sm" />
        ) : (
          <div className="w-full h-36 bg-slate-50 flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold tracking-widest uppercase">
            No Image
          </div>
        )}

        <div className="mt-1">
          <h3 className="font-black text-amstar-blue text-lg leading-tight">
            {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-1">{item.serviceType}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 mt-auto">
          <div>
            <span className="text-slate-400 block font-bold uppercase tracking-wider mb-1">VIN</span>
            <span className="font-mono bg-slate-100 px-2 py-1 rounded-md text-slate-700 shadow-inner border border-slate-200 block truncate">{item.vehicle?.vin || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold uppercase tracking-wider mb-1">License Plate</span>
            <div className="inline-block border border-slate-300 bg-slate-50 px-2 py-1 rounded-md text-center font-bold shadow-sm">
              {item.vehicle?.licensePlate} <span className="text-[9px] block text-slate-500 leading-none">{item.vehicle?.state}</span>
            </div>
          </div>
        </div>

        <div className="text-xs mt-1">
          <span className="text-slate-400 block font-bold uppercase tracking-wider mb-1">Technician(s)</span>
          <span className="font-bold text-slate-700">{item.assignedWorker || 'Unassigned'}</span>
        </div>
      </div>

      {/* Right Side: Interactive Pricing Controls */}
      <div className="p-5 flex-1 bg-slate-50/50 flex flex-col justify-between space-y-5">

        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Invoice Breakdown</h4>

          <label className={getRowStyle(includeRetail)}>
            <span className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={includeRetail} onChange={e => setIncludeRetail(e.target.checked)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-slate-300 cursor-pointer transition-all" />
              Retail Price
            </span>
            <div className="flex items-center gap-1.5 font-black text-slate-600">
              <span className={includeRetail ? 'text-amstar-blue' : 'text-slate-400'}>$</span>
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
            <span className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={includeLease} onChange={e => setIncludeLease(e.target.checked)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-slate-300 cursor-pointer transition-all" />
              Lease Price
            </span>
            <div className="flex items-center gap-1.5 font-black text-slate-600">
              <span className={includeLease ? 'text-amstar-blue' : 'text-slate-400'}>$</span>
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
            <span className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={includeLabor} onChange={e => setIncludeLabor(e.target.checked)} className="w-4 h-4 rounded text-amstar-blue focus:ring-amstar-blue border-slate-300 cursor-pointer transition-all" />
              Labor Price
            </span>
            <div className="flex items-center gap-1.5 font-black text-slate-600">
              <span className={includeLabor ? 'text-amstar-blue' : 'text-slate-400'}>$</span>
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

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between mt-auto">
          <div>
            <span className="text-xs text-slate-400 font-black block uppercase tracking-widest mb-1">Total Billed</span>
            <span className="text-3xl font-black text-emerald-600 tracking-tight">${currentTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-amstar-blue hover:bg-slate-800 text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
        <h2 className="text-2xl font-black text-amstar-blue">Pricing & Invoice Calculator</h2>
        <input
          type="text"
          placeholder="Search by name, VIN, plate, vehicle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={SEARCH_INPUT_STYLE}
        />
      </div>

      {filteredRepairs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 font-medium">
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

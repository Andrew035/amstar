import React, { useState } from 'react';
import type { VehicleRepair } from '../types/repair';

// Tailwind Pricing Card Component
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

  const currentTotal =
    (includeRetail ? retailPrice : 0) +
    (includeLease ? leasePrice : 0) +
    (includeLabor ? laborPrice : 0);

  const handleSave = () => {
    onSavePricing(item.id!, {
      retailPrice,
      leasePrice,
      laborPrice,
      includeRetail,
      includeLease,
      includeLabor
    });
  };

  return (
    <div className='bg-white rounded-xl border- border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row'>

      {/* Vehicle Info */}
      <div className='p-5 flex-1 border-b md:border-b-0 md:border-r border-slate-100 flex-col gap-3'>
        {item.vehicle?.carImageUrl ? (
          <img src={item.vehicle.carImageUrl} alt="Vehicle Image" className='w-full h-64 object-cover rounded-lg' />
        ) : (
          <div className='w-full h-32 bg-slate-100 flex items-center justify-center rounded-lg text-slate-400 text-xs font-bold'>
            NO IMAGE
          </div>
        )}
        <div>
          <h3 className='font-bold text-amstar-blue text-base'>
            {item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}
          </h3>
          <p className='text-xs text-slate-500 font-semibold'>{item.serviceType}</p>
        </div>
        <div className='grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100'>
          <div>
            <span className='mb-2 text-slate-400 block font-medium'>VIN</span>
            <span className='font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700'>{item.vehicle?.vin || 'N/A'}</span>
          </div>
          <div>
            <span className='mb-2 text-slate-400 block font-medium'>LICENSE PLATE</span>
            <span className='font-bold bg-slate-100 px-1.5 py-0.5 rounded'>{item.vehicle?.licensePlate} ({item.vehicle?.state})</span>
          </div>
        </div>
        <div className='text-xs'>
          <span className='pt-4 font-slate-400 block font-medium'>ASSIGNED WORKER(S)</span>
          <span className='pt-2 font-semibold text-amstar-red'>{item.assignedWorker || 'Unassigned'}</span>
        </div>
      </div>

      {/* Pricing Inputs */}
      <div className='p-5 flex-1 bg-slate-50 flex flex-col justify-between space-y-4'>
        <div className='space-y-3'>
          <h4 className='text-xs font-black uppercase tracking-wider text-slate-500'>Invoice Breakdown</h4>

          <label className='flex items-center justify-between text-sm bg-white p-2.5 rounded-lg border border-slate-200'>
            <span className='flex items-center gap-2 font-medium text-slate-700'>
              <input type='checkbox' checked={includeRetail} onChange={e => setIncludeRetail(e.target.checked)} className='rounded text-amstar-blue' />
              Retail Price
            </span>
            <div className='flex items-center gap-1 font-bold'>
              <span>$</span>
              <input
                type='number'
                disabled={!includeRetail}
                value={retailPrice}
                onChange={e => setRetailPrice(Number(e.target.value))}
                className='w-20 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-right disabled:opacity-40'
              />
            </div>
          </label>

          <label className='flex items-center justify-between text-sm bg-white p-2.5 rounded-lg border border-slate-200'>
            <span className='flex items-center gap-2 font-medium text-slate-700'>
              <input type='checkbox' checked={includeLease} onChange={e => setIncludeLease(e.target.checked)} className='rounded text-amstar-blue' />
              Lease Price
            </span>
            <div className='flex items-center gap-1 font-bold'>
              <span>$</span>
              <input
                type='number'
                disabled={!includeLease}
                value={leasePrice}
                onChange={e => setLeasePrice(Number(e.target.value))}
                className='w-20 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-right disabled:opacity-40'
              />
            </div>
          </label>

          <label className='flex items-center justify-between text-sm bg-white p-2.5 rounded-lg border border-slate-200'>
            <span className='flex items-center gap-2 font-medium text-slate-700'>
              <input type='checkbox' checked={includeLabor} onChange={e => setIncludeLabor(e.target.checked)} className='rounded text-amstar-blue' />
              Labor Price
            </span>
            <div className='flex items-center gap-1 font-bold'>
              <span>$</span>
              <input
                type='number'
                disabled={!includeLabor}
                value={laborPrice}
                onChange={e => setLaborPrice(Number(e.target.value))}
                className='w-20 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-right disabled:opacity-40'
              />
            </div>
          </label>
        </div>

        <div className='pt-4 border-t border-slate-200 flex items-center justify-between'>
          <div>
            <span className='text-xs text-slate-500 font-bold block uppercase'>Total Price</span>
            <span className='text-2xl font-black text-emerald-600'>${currentTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSave}
            className='px-4 py-2 bg-amstar-blue hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow transition'
          >
            Save Pricing
          </button>
        </div>
      </div>
    </div>
  )
};

export const PricingPage: React.FC<{
  repairs: VehicleRepair[];
  onSavePricing: (id: number, payload: any) => void;
}> = ({ repairs, onSavePricing }) => {
  return (
    <div className='space-y-6'>
      <div className='border-b-2 border-amstar-red pb-2'>
        <h2 className='text-2xl font-black text-amstar-blue'>Pricing</h2>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        {repairs.map(item => (
          <PricingCard key={item.id} item={item} onSavePricing={onSavePricing} />
        ))}
      </div>
    </div>
  )
}

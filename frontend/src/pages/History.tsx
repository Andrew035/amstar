import React, { useState } from 'react';
import type { VehicleRepair } from '../types/repair';

export const HistoryPage: React.FC<{
  repairs: VehicleRepair[];
  onStatusChange: (id: number, status: string) => void;
  onViewDeepDive: (repair: VehicleRepair) => void;
  onDeleteClick: (id: number) => void;
  viewedRepairId?: number | null;
}> = ({ repairs, onStatusChange, onViewDeepDive, onDeleteClick, viewedRepairId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const completedRepairs = repairs
    .filter(r => r.status === 'COMPLETED')
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
    .sort((a, b) => new Date(b.actualCompletionDate || b.expectedCompletionDate).getTime() - new Date(a.actualCompletionDate || a.expectedCompletionDate).getTime());


  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500 text-white';
      case 'IN_PROGRESS':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  const calculateTotal = (item: VehicleRepair) => {
    return (
      (item.includeRetail ? item.retailPrice || 0 : 0) +
      (item.includeLease ? item.leasePrice || 0 : 0) +
      (item.includeLabor ? item.laborPrice || 0 : 0)
    );
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4'>
        <h2 className='text-2xl font-black text-amstar-blue'>Completed Services Ledger</h2>
        <input
          type='text'
          placeholder='Search history by name, VIN, plate...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='px-4 py-2 text-sm rounded-full border border-slate-300 w-full sm:w-72 shadow-sm focus:outline-none focus:ring-2 focus:ring-amstar-blue'
        />
      </div>

      {completedRepairs.length === 0 ? (
        <div className='p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500'>
          {searchTerm ? 'No completed repairs match your search.' : 'No completed services recorded yet.'}
        </div>
      ) : (
        <div className='overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm'>
          <table className='w-full text-left text-xs border-collapse'>
            <thead className='bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold'>
              <tr>
                <th className='p-3'>Entry Date</th>
                <th className='p-3'>Completion Date</th>
                <th className='p-3'>Customer</th>
                <th className='p-3'>Vehicle Image</th>
                <th className='p-3'>License Plate</th>
                <th className='p-3'>Vehicle Details</th>
                <th className='p-3'>Service Details</th>
                <th className='p-3'>Technician(s)</th>
                <th className='p-3'>Total Price</th>
                <th className='p-3'>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {completedRepairs.map(item => (
                <tr
                  key={item.id}
                  onClick={() => onDeleteClick(item.id!)}
                  className={`hover:bg-red-50 transition cursor-pointer ${viewedRepairId === item.id ? 'bg-sky-50' : ''}`}
                  title='Click to delete this ticket'
                >
                  <td className='p-3 text-slate-500'>{item.entryDate}</td>
                  <td className='p-3 font-bold text-slate-800'>{item.actualCompletionDate || item.expectedCompletionDate}</td>
                  <td className='p-3 font-semibold text-slate-800'>{item.customerName}</td>
                  <td className='p-3'>
                    {item.vehicle?.carImageUrl ? (
                      <img
                        src={item.vehicle.carImageUrl}
                        alt='Vehicle Image'
                        onClick={e => {
                          e.stopPropagation();
                          onViewDeepDive(item);
                        }}
                        className='w-16 h-10 object-cover rounded shadow-sm hover:scale-110 transition duration-200'
                      />
                    ) : (
                      <span className='text-slate-400'>No Image</span>
                    )}
                  </td>
                  <td className='p-3'>
                    <div className='border border-slate-400 bg-slate-100 px-2 py-0.5 rounded text-center font-bold'>
                      {item.vehicle?.licensePlate} <span className='text-[10px] block text-slate-500'>{item.vehicle?.state}</span>
                    </div>
                  </td>
                  <td className='p-3 font-medium text-slate-700'>{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</td>
                  <td className='p-3 font-semibold text-slate-800'>{item.serviceType}</td>
                  <td className='p-3 text-slate-700'>{item.assignedWorker || 'Unassigned'}</td>
                  <td className='p-3 font-black text-emerald-600 text-sm'>
                    ${calculateTotal(item).toFixed(2)}
                  </td>
                  <td className="p-3">
                    <select
                      value={item.status || 'PENDING'}
                      onChange={e => onStatusChange(item.id!, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className={`text-xs font-bold px-2 py-1 rounded border-none shadow-sm cursor-pointer ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      <option value="PENDING" className="bg-white text-slate-800 font-normal">PENDING</option>
                      <option value="IN_PROGRESS" className="bg-white text-slate-800 font-normal">IN PROGRESS</option>
                      <option value="COMPLETED" className="bg-white text-slate-800 font-normal">COMPLETED</option>
                    </select>
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

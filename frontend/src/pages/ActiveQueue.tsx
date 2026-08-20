import React, { useState } from "react";
import type { VehicleRepair } from "../types/repair";
import { RepairForm } from "../components/RepairForm";

export const ActiveQueue: React.FC<{
  repairs: VehicleRepair[];
  isAdmin: boolean;
  currentUser: string;
  historicalServiceMap: Record<string, number>;
  onRefresh: () => void;
  onStatusChange: (id: number, status: string) => void;
  onAssignWorker: (id: number, workers: string) => void;
  onDeleteClick: (id: number) => void;
  onViewDeepDive: (repair: VehicleRepair) => void;
  viewedRepairId?: number | null;
}> = ({
  repairs,
  isAdmin,
  currentUser,
  historicalServiceMap,
  onRefresh,
  onStatusChange,
  onAssignWorker,
  onDeleteClick,
  onViewDeepDive,
  viewedRepairId,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const activeRepairs = repairs
      .filter(r => r.status !== 'COMPLETED')
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
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

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

    return (
      <div className='space-y-6'>

        {/* Intake Form (Admins only) */}
        {isAdmin && (
          <RepairForm
            onSuccess={onRefresh}
            currentUser={currentUser}
            isAdmin={isAdmin}
            historicalServiceMap={historicalServiceMap}
          />
        )}

        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
          <h2 className="text-2xl font-black text-amstar-blue">
            {isAdmin ? 'Shop Active Repairs (Admin View)' : 'Shop Active Repairs (Shop View)'}
          </h2>
          <input
            type="text"
            placeholder="Search by name, VIN, plate, worker..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-4 py-2 text-sm rounded-full border border-slate-300 w-full sm:w-72 shadow-sm focus:outline-none focus:ring-2 focus:ring-amstar-blue"
          />
        </div>

        {activeRepairs.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
            {searchTerm ? 'No active repairs match your search.' : 'No active repairs in the shop queue.'}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Image</th>
                  <th className="p-3">License Plate</th>
                  <th className="p-3">Specs</th>
                  <th className="p-3">VIN</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Entry Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Assigned Technician(s)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRepairs.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => isAdmin && onDeleteClick(item.id!)}
                    className={`transition ${isAdmin ? 'hover:bg-red-50 cursor-pointer' : ''} ${viewedRepairId === item.id
                      ? 'bg-sky-50'
                      : index === 0 && !searchTerm
                        ? 'bg-amber-50'
                        : 'bg-white'
                      }`}
                    title={isAdmin ? 'Click to delete this repair' : ''}
                  >
                    <td className="p-3 font-black text-slate-800">#{index + 1}</td>
                    <td className="p-3 font-bold text-amstar-blue">{item.priorityScore?.toFixed(1)}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.customerName}</td>
                    <td className="p-3">
                      {item.vehicle?.carImageUrl ? (
                        <img
                          src={item.vehicle.carImageUrl}
                          alt="Vehicle Image"
                          onClick={e => {
                            e.stopPropagation();
                            onViewDeepDive(item);
                          }}
                          className="w-16 h-10 object-cover rounded shadow-sm hover:scale-110 transition duration-200"
                        />
                      ) : (
                        <span className="text-slate-400">No Image</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="border border-slate-400 bg-slate-100 px-2 py-0.5 rounded text-center font-bold">
                        {item.vehicle?.licensePlate} <span className="text-[10px] block text-slate-500">{item.vehicle?.state}</span>
                      </div>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{item.vehicle?.year} {item.vehicle?.make} {item.vehicle?.model}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{item.vehicle?.vin || 'Unknown'}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.serviceType}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-white text-[11px] ${item.severity >= 4 ? 'bg-red-500' : item.severity >= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                      >
                        Level {item.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{item.entryDate}</td>
                    <td className="p-3 font-semibold text-slate-700">{item.expectedCompletionDate}</td>

                    {/* Multi-worker Selection */}
                    <td className="p-3">
                      {isAdmin ? (
                        <select
                          multiple
                          value={item.assignedWorker ? item.assignedWorker.split(', ') : []}
                          onChange={e => {
                            const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                            onAssignWorker(item.id!, selected.join(', '));
                          }}
                          onClick={e => e.stopPropagation()}
                          className="text-xs p-1 border border-slate-300 rounded bg-white w-28 h-12 focus:ring-1 focus:ring-amstar-blue"
                        >
                          <option value="worker1">Technician 1</option>
                          <option value="worker1">Technician 2</option>
                          <option value="worker1">Technician 3</option>
                        </select>
                      ) : (
                        <span className="font-bold text-slate-700">{item.assignedWorker || 'Unassigned'}</span>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-3">
                      {isAdmin ? (
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
                      ) : (
                        <span className={`px-2 py-1 rounded font-bold text-[11px] ${getStatusBadge(item.status)}`}>
                          {item.status?.replace('_', ' ')}
                        </span>
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

import React, { useEffect, useState } from 'react';
import { VehicleRepair } from '../types/repair';

export const RepairQueue: React.FC = () => {
    const [repairs, setRepairs] = useState<VehicleRepair[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchQueue = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/repairs/queue');
            const data = await response.json();
            setRepairs(data);
        } catch (error) {
            console.error('Failed to fetch repairs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    return (
        <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
            <h2>Am Star Transmissions - Service Priority Queue</h2>
            <p style={{ color: '#666' }}>
                Priority calculation is driven by repair severity, entry timestamp, and targeted completion deadlines.
            </p>

            {loading ? (
                <p>Loading repairs...</p>
            ) : (
                <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f4f4f4' }}>
                            <th>Priority Rank</th>
                            <th>Score</th>
                            <th>Customer</th>
                            <th>Vehicle</th>
                            <th>Service Required</th>
                            <th>Severity (1-5)</th>
                            <th>Entry Date</th>
                            <th>Due Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {repairs.map((item, index) => (
                            <tr key={item.id} style={{ backgroundColor: index === 0 ? '#fff3cd' : 'tranparent' }}>
                                <td><strong>#{index + 1}</strong></td>
                                <td><strong>{item.priorityScore?.toFixed(1)}</strong></td>
                                <td>{item.customerName}</td>
                                <td>{item.vehicleDetails}</td>
                                <td>{item.serviceType}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        backgroundColor: item.severity >= 4 ? '#d9534f' : item.severity >= 3 ? '#f0ad4e' : '#5cb85c'
                                    }}>
                                        Level {item.severity}
                                    </span>
                                </td>
                                <td>{item.entryDate}</td>
                                <td>{item.expectedCompletionDate}</td>
                                <td>{item.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

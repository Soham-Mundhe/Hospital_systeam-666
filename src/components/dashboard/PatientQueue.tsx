import type { FC } from 'react';
import { clsx } from 'clsx';
import { Clock, Users, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';

interface QueueItem {
    id: string;
    name: string;
    waitTime: string;
    status: 'waiting' | 'in-consultation';
    type: 'Walk-in' | 'Appointment';
}

// FUTURE-READY DATA COLLECTION:
// - Capture exact wait time per patient (arrival_timestamp - service_start_timestamp)
// - Correlate wait times with "Reason for Visit"
// - Used for future IE/OR & ML analysis — not active in MVP.

const queueData: QueueItem[] = [
    { id: '1', name: 'Sarah Connor', waitTime: '5m', status: 'in-consultation', type: 'Appointment' },
    { id: '2', name: 'John Reese', waitTime: '12m', status: 'waiting', type: 'Walk-in' },
    { id: '3', name: 'T-800', waitTime: '25m', status: 'waiting', type: 'Appointment' },
    { id: '4', name: 'Kyle Reese', waitTime: '30m', status: 'waiting', type: 'Walk-in' },
    { id: '5', name: 'Dr. Silberman', waitTime: '45m', status: 'waiting', type: 'Appointment' },
];

export const PatientQueue: FC = () => {
    const { queueLength, avgWaitTime } = useSimulation();

    // Derived state for visual variety
    const isDelayed = avgWaitTime > 15;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        Live Queue
                    </h3>
                    <span className={clsx(
                        "text-xs px-2 py-1 rounded-full font-medium transition-colors duration-500",
                        queueLength > 5 ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
                    )}>
                        {queueLength} Pending
                    </span>
                </div>

                {/* Virtual Queue Panel Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Est. Wait: <span className={clsx(
                            "font-bold transition-colors duration-500",
                            isDelayed ? "text-orange-600" : "text-gray-900"
                        )}>{avgWaitTime} min</span>
                    </div>
                </div>

                {/* Soft Notification Banner */}
                {isDelayed && (
                    <div className="mt-3 bg-orange-50 border border-orange-100 rounded-lg p-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-orange-800">
                            <span className="font-semibold">Slight Delay:</span> Dr. Smith is running ~{avgWaitTime - 10}m behind due to an emergency case.
                        </div>
                    </div>
                )}
            </div>

            <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                {queueData.slice(0, queueLength).map((patient, idx) => (
                    <div key={patient.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative",
                                patient.status === 'in-consultation' ? "bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-2" : "bg-gray-100 text-gray-600"
                            )}>
                                {patient.name.charAt(0)}
                                {patient.status === 'waiting' && idx === 0 && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className={clsx(
                                        "px-1.5 py-0.5 rounded",
                                        patient.type === 'Appointment' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                                    )}>{patient.type}</span>

                                    {/* Estimated visible wait time based on position */}
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {patient.status === 'in-consultation' ? 'Now' : `~${(idx) * 10 + 5}m`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {patient.status === 'waiting' && (
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                                Call <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                        {patient.status === 'in-consultation' && (
                            <span className="text-xs font-bold text-green-600 animate-pulse bg-green-50 px-2 py-1 rounded">Active</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
                Queue updates live via WebSocket (Sim)
            </div>
        </div>
    );
};

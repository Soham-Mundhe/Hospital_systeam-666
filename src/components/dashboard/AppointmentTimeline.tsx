import { useState } from 'react';
import type { FC } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, Clock, ChevronDown, Calendar, AlertCircle } from 'lucide-react';

type VisitType = 'routine' | 'chronic' | 'symptoms';

interface Appointment {
    time: string;
    patient: string;
    type: string;
    visitType: VisitType;
    status: 'completed' | 'current' | 'upcoming' | 'cancelled';
    duration: number; // in minutes
}

// FUTURE-READY DATA COLLECTION:
// - Track actual start time vs scheduled time
// - Track duration variance by visit type
// - Used for future IE/OR & ML analysis — not active in MVP.

const initialSchedule: Appointment[] = [
    { time: '09:00 AM', patient: 'Alice Green', type: 'Routine Checkup', visitType: 'routine', status: 'completed', duration: 15 },
    { time: '09:30 AM', patient: 'Bob White', type: 'Follow-up', visitType: 'chronic', status: 'completed', duration: 30 },
    { time: '10:00 AM', patient: 'Charlie Black', type: 'Emergency', visitType: 'symptoms', status: 'cancelled', duration: 45 },
    { time: '10:15 AM', patient: 'Diana Red', type: 'Routine Checkup', visitType: 'routine', status: 'current', duration: 15 },
    { time: '10:45 AM', patient: 'Evan Hall', type: 'New Patient', visitType: 'symptoms', status: 'upcoming', duration: 45 },
    { time: '11:15 AM', patient: 'Fiona Hill', type: 'Consultation', visitType: 'chronic', status: 'upcoming', duration: 30 },
];

export const AppointmentTimeline: FC = () => {
    const [schedule] = useState<Appointment[]>(initialSchedule);
    const [selectedVisitType, setSelectedVisitType] = useState<VisitType>('routine');

    const getSlotColor = (duration: number) => {
        if (duration <= 15) return "bg-green-50 border-green-200 text-green-700"; // Short
        if (duration <= 30) return "bg-blue-50 border-blue-200 text-blue-700";   // Medium
        return "bg-orange-50 border-orange-200 text-orange-700";                // Long
    };



    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Today's Schedule
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Smart scheduling active</p>
                </div>

                {/* Reason for Visit Selector (Simulation) */}
                <div className="flex flex-col items-end gap-2">
                    <label className="text-xs font-medium text-gray-600">Next Slot Type (Sim)</label>
                    <div className="relative">
                        <select
                            value={selectedVisitType}
                            onChange={(e) => setSelectedVisitType(e.target.value as VisitType)}
                            className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-32 p-2 pr-8"
                        >
                            <option value="routine">Routine (15m)</option>
                            <option value="chronic">Chronic (30m)</option>
                            <option value="symptoms">New Sx (45m)</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 flex-1 overflow-y-auto pr-2">
                {schedule.map((item, idx) => (
                    <div key={idx} className="relative pl-8 group">
                        {/* Timeline Dot */}
                        <div className={clsx(
                            "absolute -left-[9px] top-6 w-4 h-4 rounded-full border-2 bg-white z-10",
                            item.status === 'completed' && "border-green-500 bg-green-500",
                            item.status === 'current' && "border-primary bg-primary animate-pulse scale-125",
                            item.status === 'upcoming' && "border-gray-300 group-hover:border-primary transition-colors",
                            item.status === 'cancelled' && "border-red-300 bg-red-50"
                        )}></div>

                        {/* Current Time Indicator Line */}
                        {item.status === 'current' && (
                            <div className="absolute -left-[9px] top-6 w-0.5 h-full bg-primary/20 -z-0"></div>
                        )}

                        <div className={clsx(
                            "p-3 rounded-lg border transition-all hover:shadow-md",
                            item.status === 'current' ? "bg-white border-primary shadow-sm" : getSlotColor(item.duration),
                            item.status === 'cancelled' && "opacity-60 grayscale bg-gray-50 border-gray-200"
                        )}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                                <div>
                                    <span className="text-xs font-bold opacity-75 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.time} ({item.duration}m)
                                    </span>
                                    <h4 className={clsx(
                                        "text-base font-semibold mt-1",
                                        item.status === 'cancelled' && "line-through"
                                    )}>{item.patient}</h4>
                                </div>

                                <span className={clsx(
                                    "text-xs px-2 py-1 rounded-full font-medium mt-2 sm:mt-0 w-fit",
                                    item.visitType === 'routine' && "bg-green-200 text-green-800",
                                    item.visitType === 'chronic' && "bg-blue-200 text-blue-800",
                                    item.visitType === 'symptoms' && "bg-orange-200 text-orange-800"
                                )}>
                                    {item.type}
                                </span>
                            </div>

                            {item.status === 'completed' && (
                                <div className="text-green-700 text-xs font-medium flex items-center gap-1 mt-1 border-t border-green-200 pt-2">
                                    <CheckCircle2 className="w-3 h-3" /> Checked In
                                </div>
                            )}

                            {item.status === 'current' && (
                                <div className="text-primary text-xs font-medium flex items-center gap-1 mt-1 border-t border-primary/20 pt-2 animate-pulse">
                                    <AlertCircle className="w-3 h-3" /> In Progress
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-center text-gray-400">
                AI-assisted scheduling adjustments active
            </div>
        </div>
    );
};

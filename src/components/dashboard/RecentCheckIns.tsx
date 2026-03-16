/**
 * RecentCheckIns
 *
 * Real-time table widget showing the latest patient check-ins from Firestore.
 * Subscribes to facilities/{facilityId}/checkins and renders the 10 most recent.
 */

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserCheck, Loader2, Inbox } from 'lucide-react';

interface CheckInRecord {
    id: string;
    patient_id: string;
    name: string;
    age: number;
    gender: string;
    disease: string;
    visit_date: string;
    blood_pressure?: string;
    glucose_level?: string;
}

interface Props {
    facilityId: string;
}

export const RecentCheckIns: FC<Props> = ({ facilityId }) => {
    const [records, setRecords] = useState<CheckInRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!facilityId) return;

        const unsub = onSnapshot(
            query(
                collection(db, 'facilities', facilityId, 'checkins'),
                orderBy('visit_date', 'desc'),
                limit(10)
            ),
            (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CheckInRecord));
                setRecords(data);
                setLoading(false);
            },
            (err) => {
                console.error('[RecentCheckIns]', err);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [facilityId]);

    const genderBadge = (g: string) => {
        const lower = g?.toLowerCase();
        if (lower === 'male') return 'bg-blue-50 text-blue-700';
        if (lower === 'female') return 'bg-pink-50 text-pink-700';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Recent Patient Check-Ins</h3>
                        <p className="text-xs text-gray-400">Live from QR scan submissions</p>
                    </div>
                </div>
                {/* Live dot */}
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live
                </span>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300 gap-2">
                    <Inbox className="w-8 h-8" />
                    <p className="text-sm">No check-ins yet — share the QR code with patients</p>
                </div>
            ) : (
                <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                <th className="pb-2 px-2 font-semibold">Patient ID</th>
                                <th className="pb-2 px-2 font-semibold">Name</th>
                                <th className="pb-2 px-2 font-semibold">Age</th>
                                <th className="pb-2 px-2 font-semibold">Gender</th>
                                <th className="pb-2 px-2 font-semibold">Disease</th>
                                <th className="pb-2 px-2 font-semibold">Visit Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => (
                                <tr
                                    key={r.id}
                                    className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${i === 0 ? 'bg-teal-50/40' : ''}`}
                                >
                                    <td className="py-2.5 px-2">
                                        <span className="font-mono text-xs text-gray-500">{r.patient_id}</span>
                                    </td>
                                    <td className="py-2.5 px-2 font-medium text-gray-800">{r.name}</td>
                                    <td className="py-2.5 px-2 text-gray-600">{r.age}</td>
                                    <td className="py-2.5 px-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${genderBadge(r.gender)}`}>
                                            {r.gender}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-2">
                                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">
                                            {r.disease}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-gray-500 text-xs font-mono">{r.visit_date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

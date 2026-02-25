import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend,
} from 'recharts';
import { Download, Loader2, Activity, TrendingUp, Users, Clock, Stethoscope, Wifi } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { exportCSV } from '../utils/reporting';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportSlot {
    slotId: string;
    date?: string;
    slot?: string;
    newAdmissions?: number;
    discharges?: number;
    occupiedBeds?: number;
    icuOccupied?: number;
    fluCases?: number;
    dengueCases?: number;
    covidCases?: number;
    emergencyCases?: number;
}

interface PatientDoc {
    status?: string;
    admissionDate?: string;
    lengthOfStay?: number;
    diagnosis?: string;
    icuRequired?: boolean;
}

// Friendly label from slotId e.g. "2026-02-26_00" → "26 Feb 00:00"
function slotLabel(slotId: string): string {
    try {
        const [datePart, hourPart] = slotId.split('_');
        const d = new Date(`${datePart}T${hourPart}:00:00`);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ` ${hourPart}:00`;
    } catch {
        return slotId;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Analytics: FC = () => {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState<'Weekly' | 'Monthly'>('Weekly');
    const [isExporting, setIsExporting] = useState(false);

    // Live Firestore data
    const [reports, setReports] = useState<ReportSlot[]>([]);
    const [patients, setPatients] = useState<PatientDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    useEffect(() => {
        if (!user?.facilityId) return;
        const fid = user.facilityId;

        // 1. Reports onSnapshot
        const rUnsub = onSnapshot(
            query(collection(db, 'facilities', fid, 'reports'), orderBy('__name__')),
            (snap) => {
                const rows: ReportSlot[] = snap.docs.map(d => ({
                    slotId: d.id,
                    ...d.data(),
                } as ReportSlot));
                setReports(rows);
                setLastSync(new Date());
                setIsLoading(false);
            },
            (err) => { console.error('[Analytics] reports:', err); setIsLoading(false); }
        );

        // 2. Patients onSnapshot
        const pUnsub = onSnapshot(
            collection(db, 'facilities', fid, 'patients'),
            (snap) => {
                setPatients(snap.docs.map(d => d.data() as PatientDoc));
            },
            (err) => console.error('[Analytics] patients:', err)
        );

        return () => { rUnsub(); pUnsub(); };
    }, [user?.facilityId]);

    const handleExport = async () => {
        if (!user) return;
        setIsExporting(true);
        try { await exportCSV(user.facilityId); }
        catch { alert('Export failed. Please try again.'); }
        finally { setIsExporting(false); }
    };

    // ── Derived metrics ──────────────────────────────────────────────────────

    // Filter reports by timeRange — last 7 slots (Weekly) or all (Monthly)
    const filteredReports = timeRange === 'Weekly' ? reports.slice(-7) : reports;

    // Chart data for hospital: admissions vs discharges per slot
    const hospitalChartData = filteredReports.map(r => ({
        name: slotLabel(r.slotId),
        admissions: r.newAdmissions ?? 0,
        discharges: r.discharges ?? 0,
        icu: r.icuOccupied ?? 0,
    }));

    // Disease chart: flu / dengue / covid per slot
    const diseaseChartData = filteredReports.map(r => ({
        name: slotLabel(r.slotId),
        flu: r.fluCases ?? 0,
        dengue: r.dengueCases ?? 0,
        covid: r.covidCases ?? 0,
    }));

    // Stat cards
    const activePatients = patients.filter(p => p.status === 'admitted' || p.status === 'critical').length;
    const totalDischarges = patients.filter(p => p.status === 'discharged').length;
    const avgStay = (() => {
        const stays = patients.map(p => p.lengthOfStay ?? 0).filter(s => s > 0);
        return stays.length ? (stays.reduce((a, b) => a + b, 0) / stays.length).toFixed(1) : '—';
    })();

    const totalAdmissions = reports.reduce((s, r) => s + (r.newAdmissions ?? 0), 0);
    const totalEmergency = reports.reduce((s, r) => s + (r.emergencyCases ?? 0), 0);

    const fluTotal = patients.filter(p => typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('flu')).length;
    const dengueTotal = patients.filter(p => typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('dengue')).length;
    const covidTotal = patients.filter(p => typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('covid')).length;

    if (!user) return null;

    // ── Charts ───────────────────────────────────────────────────────────────

    const tooltipStyle = {
        contentStyle: { backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        cursor: { stroke: '#ADD8E6', strokeWidth: 2 },
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics &amp; Trends</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-gray-500 text-sm">
                            {user.facilityType === 'hospital' ? 'Patient Flow Analysis' :
                                user.facilityType === 'clinic' ? 'Visitor Trends' : 'Test Volume Analysis'}
                        </p>
                        {lastSync && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                                <Wifi className="w-3 h-3" /> Live · {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {user.facilityType === 'hospital' && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                        >
                            {isExporting
                                ? <><Loader2 className="w-4 h-4 animate-spin" />Exporting…</>
                                : <><Download className="w-4 h-4" />Export Reports CSV</>
                            }
                        </button>
                    )}
                    <div className="bg-white rounded-lg p-1 border border-gray-200 flex">
                        {(['Weekly', 'Monthly'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeRange(t)}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${timeRange === t ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Active Patients" value={String(activePatients)} sub="currently admitted / critical" color="blue" />
                <StatCard icon={<Activity className="w-5 h-5 text-green-500" />} label="Total Admissions" value={String(totalAdmissions)} sub="across all report slots" color="green" />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-purple-500" />} label="Discharges" value={String(totalDischarges)} sub="patients discharged" color="purple" />
                <StatCard icon={<Clock className="w-5 h-5 text-orange-500" />} label="Avg. Stay" value={avgStay === '—' ? '—' : `${avgStay}d`} sub="average length of stay" color="orange" />
            </div>

            {/* ── Main Chart: Admissions vs Discharges ── */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {user.facilityType === 'hospital' ? 'Admissions vs Discharges' :
                            user.facilityType === 'clinic' ? 'Patient Visits' : 'Tests Conducted'}
                    </h3>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                </div>

                {!isLoading && hospitalChartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                        <Stethoscope className="w-8 h-8" />
                        <p className="text-sm">No report data yet — add patients to generate reports</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={hospitalChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Legend />
                            <Line type="monotone" dataKey="admissions" name="Admissions" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="discharges" name="Discharges" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="icu" name="ICU" stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Disease Distribution Chart ── */}
            {user.facilityType === 'hospital' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Disease Distribution by Slot</h3>
                    {diseaseChartData.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                            No disease data yet
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={diseaseChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip {...tooltipStyle} />
                                <Legend />
                                <Bar dataKey="flu" name="Flu" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="dengue" name="Dengue" fill="#f87171" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="covid" name="Covid" fill="#818cf8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Emergency Cases</h4>
                    <div className="text-3xl font-bold text-red-600">{totalEmergency}</div>
                    <p className="text-xs text-gray-500 mt-1">Total emergency cases across all slots</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-3">Disease Breakdown</h4>
                    <div className="space-y-2">
                        <DiseaseBadge label="Flu" count={fluTotal} color="yellow" />
                        <DiseaseBadge label="Dengue" count={dengueTotal} color="red" />
                        <DiseaseBadge label="Covid" count={covidTotal} color="purple" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Total Report Slots</h4>
                    <div className="text-3xl font-bold text-gray-700">{reports.length}</div>
                    <p className="text-xs text-gray-500 mt-1">6-hour aggregation slots in Firestore</p>
                </div>
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
};

const StatCard: FC<{ icon: React.ReactNode; label: string; value: string; sub: string; color: string }> = ({
    icon, label, value, sub, color,
}) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-1 text-gray-500 text-xs font-medium">
            {icon} {label}
        </div>
        <div className={`text-2xl font-bold ${colorMap[color] ?? 'text-gray-700'}`}>{value}</div>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
);

const diseaseColorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
};

const DiseaseBadge: FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diseaseColorMap[color] ?? 'bg-gray-100 text-gray-700'}`}>
            {count} case{count !== 1 ? 's' : ''}
        </span>
    </div>
);

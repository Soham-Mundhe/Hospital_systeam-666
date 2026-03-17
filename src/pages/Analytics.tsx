import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend,
} from 'recharts';
import { Loader2, Activity, TrendingUp, Users, Clock, Wifi, Zap, RefreshCw, Stethoscope } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportSlot {
    slotId: string;
    date?: string;
    slot?: string;
    newAdmissionsToday?: number;   // current field name
    newAdmissions?: number;        // legacy field name (backfilled slots)
    dischargesToday?: number;      // current field name
    discharges?: number;           // legacy field name (backfilled slots)
    occupiedBeds?: number;
    icuOccupied?: number;
    fluCases?: number;
    dengueCases?: number;
    covidCases?: number;
    emergencyCases?: number;
    totalBeds?: number;
    icuBeds?: number;
    bedUtilization?: number;
    icuStressIndex?: number;
    availableBeds?: number;
    autoFilled?: boolean;
    scheduledRun?: boolean;
    timestamp?: string;
}

interface PatientDoc {
    status?: string;
    admissionDate?: string;
    lengthOfStay?: number;
    diagnosis?: string;
    icuRequired?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safe label for a slotId. Handles malformed/legacy IDs gracefully.
 * "2026-02-26_18" → "26 Feb 18:00"
 * Anything unparseable → returns the raw slotId
 */
function slotLabel(slotId: string): string {
    if (!slotId || typeof slotId !== 'string') return String(slotId ?? '—');
    const underscoreIdx = slotId.lastIndexOf('_');
    if (underscoreIdx === -1) return slotId;                       // no underscore → raw
    const datePart = slotId.slice(0, underscoreIdx);               // "2026-02-26"
    const hourPart = slotId.slice(underscoreIdx + 1);              // "18"
    if (!datePart || !hourPart) return slotId;
    try {
        const d = new Date(`${datePart}T${hourPart}:00:00`);
        if (isNaN(d.getTime())) return slotId;                    // invalid date → raw
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            + ` ${hourPart}:00`;
    } catch {
        return slotId;
    }
}

/** Slot label short — just the hour part for compact axis ticks */
function slotLabelShort(slotId: string): string {
    const underscoreIdx = slotId?.lastIndexOf('_') ?? -1;
    if (underscoreIdx === -1) return slotId;
    const hourPart = slotId.slice(underscoreIdx + 1);
    const datePart = slotId.slice(0, underscoreIdx);
    try {
        const d = new Date(`${datePart}T${hourPart}:00:00`);
        if (isNaN(d.getTime())) return hourPart + ':00';
        const dayLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        return `${hourPart}:00\n${dayLabel}`;
    } catch {
        return hourPart + ':00';
    }
}


type TimeMode = '6H' | 'Daily' | '7Days' | 'Monthly';

export const Analytics: FC = () => {
    const { user } = useAuth();
    const [timeMode, setTimeMode] = useState<TimeMode>('Daily');

    // ── Live Firestore data ──────────────────────────────────────────────────
    const [reports, setReports] = useState<ReportSlot[]>([]);
    const [patients, setPatients] = useState<PatientDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    useEffect(() => {
        if (!user?.facilityId) return;
        const fid = user.facilityId;

        // 1. Reports — ordered by document ID (= slotId = chronological)
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

        // 2. Patients
        const pUnsub = onSnapshot(
            collection(db, 'facilities', fid, 'patients'),
            (snap) => {
                setPatients(snap.docs.map(d => d.data() as PatientDoc));
            },
            (err) => console.error('[Analytics] patients:', err)
        );

        return () => { rUnsub(); pUnsub(); };
    }, [user?.facilityId]);

    // ── Derived & Aggregated Data ───────────────────────────────────────────

    const processedData = useMemo(() => {
        if (!reports.length) return [];

        const now = new Date();

        if (timeMode === '6H') {
            return reports.slice(-8).map(r => ({
                name: slotLabelShort(r.slotId),
                fullLabel: slotLabel(r.slotId),
                admissions: r.newAdmissionsToday ?? r.newAdmissions ?? 0,
                discharges: r.dischargesToday ?? r.discharges ?? 0,
                icu: r.icuOccupied ?? 0,
                bedPct: r.bedUtilization != null ? Math.round(r.bedUtilization * 100) : 0,
                icuPct: r.icuStressIndex != null ? Math.round(r.icuStressIndex * 100) : 0,
                flu: r.fluCases ?? 0,
                dengue: r.dengueCases ?? 0,
                covid: r.covidCases ?? 0,
                autoFilled: r.autoFilled ?? false,
                count: 1,
            }));
        }

        // Helper to aggregate rows
        const aggregate = (group: ReportSlot[], label: string) => {
            const max = (key: keyof ReportSlot) => group.reduce((acc, r) => Math.max(acc, Number(r[key]) || 0), 0);
            const avg = (key: keyof ReportSlot) => group.length ? group.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) / group.length : 0;
            
            return {
                name: label,
                fullLabel: label,
                // admissions & discharges are cumulative daily totals in each slot —
                // use max (not sum) to get the correct final daily count.
                admissions: max('newAdmissionsToday') || max('newAdmissions'),
                discharges: max('dischargesToday') || max('discharges'),
                icu: Math.round(avg('icuOccupied')),
                bedPct: Math.round(avg('bedUtilization') * 100),
                icuPct: Math.round(avg('icuStressIndex') * 100),
                flu: max('fluCases'),
                dengue: max('dengueCases'),
                covid: max('covidCases'),
                count: group.length,
                autoFilled: false,
            };
        };

        if (timeMode === 'Daily' || timeMode === '7Days') {
            const grouped: Record<string, ReportSlot[]> = {};
            reports.forEach(r => {
                const d = r.date || r.slotId.split('_')[0];
                if (!grouped[d]) grouped[d] = [];
                grouped[d].push(r);
            });

            let days = Object.keys(grouped).sort();
            if (timeMode === '7Days') {
                // Rolling 7 days from today
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(now.getDate() - 7);
                const startStr = sevenDaysAgo.toISOString().split('T')[0];
                days = days.filter(d => d >= startStr);
            }

            return days.slice(-7).map(d => {
                const dateObj = new Date(d);
                const label = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                return aggregate(grouped[d], label);
            });
        }

        if (timeMode === 'Monthly') {
            const grouped: Record<string, ReportSlot[]> = {};
            reports.forEach(r => {
                const month = (r.date || r.slotId.split('_')[0]).slice(0, 7); // YYYY-MM
                if (!grouped[month]) grouped[month] = [];
                grouped[month].push(r);
            });

            return Object.keys(grouped).sort().slice(-6).map(m => {
                const dateObj = new Date(m + '-01');
                const label = dateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                return aggregate(grouped[m], label);
            });
        }

        return [];
    }, [reports, timeMode]);

    // Secondary processing for Disease Distribution
    const diseaseChartData = useMemo(() => {
        let data = processedData;
        if (timeMode === '6H') {
            // Hide slots where all disease counts are zero
            data = data.filter(d => (d.flu || 0) + (d.dengue || 0) + (d.covid || 0) > 0);
        }
        return data;
    }, [processedData, timeMode]);

    // Split report type counts
    const freshCount = reports.filter(r => !r.autoFilled).length;
    const filledCount = reports.filter(r => r.autoFilled).length;

    // Stat cards
    const activePatients = patients.filter(p => p.status === 'admitted' || p.status === 'critical').length;
    const totalDischarges = patients.filter(p => p.status === 'discharged').length;
    const avgStay = (() => {
        const stays = patients.map(p => p.lengthOfStay ?? 0).filter(s => s > 0);
        return stays.length ? (stays.reduce((a, b) => a + b, 0) / stays.length).toFixed(1) : '—';
    })();
    const totalAdmissions = reports.reduce((s, r) => s + (r.newAdmissionsToday ?? r.newAdmissions ?? 0), 0);
    const totalEmergency = patients.filter(p => p.status === 'critical').length;
    const fluTotal = patients.filter(p => typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('flu')).length;
    const dengueTotal = patients.filter(p => typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('dengue')).length;
    const covidTotal = patients.filter(p => typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('covid')).length;

    if (!user) return null;

    // ── Chart styles ─────────────────────────────────────────────────────────
    const tooltipStyle = {
        contentStyle: { backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        cursor: { stroke: '#ADD8E6', strokeWidth: 2 },
    };

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics &amp; Trends</h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-gray-500 text-sm">
                            {user.facilityType === 'hospital' ? 'Patient Flow — 6-hour slot aggregation' :
                                user.facilityType === 'clinic' ? 'Visitor Trends' : 'Test Volume Analysis'}
                        </p>
                        {lastSync && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <Wifi className="w-3 h-3" />
                                Live · {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        {/* Slot counters */}
                        {reports.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                    <Zap className="w-3 h-3" /> {freshCount} fresh
                                </span>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                                    <RefreshCw className="w-3 h-3" /> {filledCount} auto-filled
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="bg-white rounded-lg p-1 border border-gray-200 flex shadow-sm">
                        {(['6H', 'Daily', '7Days', 'Monthly'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeMode(t)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeMode === t ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                            >
                                {t === '6H' ? '6H' : t === '7Days' ? '7 Days' : t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Active Patients" value={String(activePatients)} sub="admitted / critical" color="blue" />
                <StatCard icon={<Activity className="w-5 h-5 text-green-500" />} label="Total Admissions" value={String(totalAdmissions)} sub="across all slots" color="green" />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-purple-500" />} label="Discharges" value={String(totalDischarges)} sub="patients discharged" color="purple" />
                <StatCard icon={<Clock className="w-5 h-5 text-orange-500" />} label="Avg. Stay" value={avgStay === '—' ? '—' : `${avgStay}d`} sub="avg length of stay" color="orange" />
            </div>

            {/* ── Timeline status banner ─────────────────────────────────────── */}
            {reports.length > 0 && (
                <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-3 ${filledCount > 0
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : 'bg-green-50 border border-green-200 text-green-800'
                    }`}>
                    {filledCount > 0 ? (
                        <>
                            <RefreshCw className="w-4 h-4 shrink-0" />
                            <span>
                                <strong>{filledCount} slot{filledCount !== 1 ? 's' : ''}</strong> were auto-filled (no patient activity during that window).
                                {' '}<strong>{freshCount}</strong> slots contain fresh aggregation data.
                                {' '}Timeline is <strong>continuous</strong> — no gaps.
                            </span>
                        </>
                    ) : (
                        <>
                            <Activity className="w-4 h-4 shrink-0" />
                            <span>All <strong>{freshCount}</strong> report slots contain live patient data. Timeline is complete.</span>
                        </>
                    )}
                </div>
            )}

            {/* ── Admissions vs Discharges Chart ── */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {user.facilityType === 'hospital'
                            ? `Admissions vs Discharges (${timeMode === '7Days' ? '7 Days' : timeMode})`
                            : user.facilityType === 'clinic' ? 'Patient Visits' : 'Tests Conducted'}
                    </h3>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                </div>

                {!isLoading && processedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
                        <Stethoscope className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm font-medium">No report data for this period</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={processedData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                                {...tooltipStyle}
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const isAuto = payload[0]?.payload?.autoFilled;
                                    const fullLabel = payload[0]?.payload?.fullLabel;
                                    return (
                                        <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-4 text-sm min-w-[180px]">
                                            <p className="font-bold text-gray-900 mb-2 border-b pb-1">{fullLabel || label}</p>
                                            {isAuto && (
                                                <p className="text-[10px] text-amber-600 font-bold mb-3 uppercase tracking-wider flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded">
                                                    <RefreshCw className="w-3 h-3" /> Auto-filled slot
                                                </p>
                                            )}
                                            <div className="space-y-1.5">
                                                {payload.map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center gap-4">
                                                        <span className="flex items-center gap-2 text-gray-600">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                            {p.name}
                                                        </span>
                                                        <span className="font-bold tabular-nums" style={{ color: p.color }}>{p.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="admissions" name="Admissions" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="discharges" name="Discharges" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="icu" name="ICU" stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Charts Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Bed Utilization Over Time ── */}
                {user.facilityType === 'hospital' && processedData.length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Bed &amp; ICU Utilization % ({timeMode})</h3>
                        <div className="flex-1 min-h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={processedData}>
                                    <defs>
                                        <linearGradient id="bedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="icuGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                                    <Tooltip {...tooltipStyle} />
                                    <Legend />
                                    <Area type="monotone" dataKey="bedPct" name="Bed Utilization %" stroke="#60a5fa" fill="url(#bedGrad)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="icuPct" name="ICU Stress %" stroke="#f87171" fill="url(#icuGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ── Disease Distribution Chart ── */}
                {user.facilityType === 'hospital' && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Disease Distribution ({timeMode})</h3>
                        {diseaseChartData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 text-sm italic">
                                No disease reports for this period
                            </div>
                        ) : (
                            <div className="flex-1 min-h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={diseaseChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Legend />
                                        <Bar dataKey="covid" name="Covid" fill="#3B82F6" stackId={timeMode !== '6H' ? 'a' : undefined} radius={timeMode !== '6H' ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
                                        <Bar dataKey="dengue" name="Dengue" fill="#EF4444" stackId={timeMode !== '6H' ? 'a' : undefined} radius={timeMode !== '6H' ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
                                        <Bar dataKey="flu" name="Flu" fill="#EAB308" stackId={timeMode !== '6H' ? 'a' : undefined} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Bottom row: summaries + slot timeline ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Summary cards */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Emergency Cases</h4>
                    <div className="text-3xl font-bold text-red-600">{totalEmergency}</div>
                    <p className="text-xs text-gray-500 mt-1">Total across all slots</p>
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
                    <h4 className="font-semibold text-gray-800 mb-2">Timeline Coverage</h4>
                    <div className="text-3xl font-bold text-gray-700 mb-1">{reports.length}</div>
                    <p className="text-xs text-gray-500 mb-3">Total 6-hour slots in Firestore</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-blue-700"><Zap className="w-3 h-3" /> Fresh data</span>
                            <span className="font-bold">{freshCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-amber-700"><RefreshCw className="w-3 h-3" /> Auto-filled</span>
                            <span className="font-bold">{filledCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Slot Timeline Table ── */}
            {reports.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Slot Timeline</h3>
                        <span className="text-xs text-gray-500">Most recent first · {reports.length} slots total</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Slot', 'Type', 'Beds', 'ICU', 'Admissions', 'Discharges', 'Flu', 'Dengue', 'Covid'].map(h => (
                                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[...reports].reverse().slice(0, 20).map(r => (
                                    <tr key={r.slotId} className={`hover:bg-gray-50 transition-colors ${r.autoFilled ? 'bg-amber-50/40' : ''}`}>
                                        <td className="px-4 py-2.5 font-mono text-xs text-gray-600 whitespace-nowrap">{slotLabel(r.slotId)}</td>
                                        <td className="px-4 py-2.5">
                                            {r.autoFilled ? (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                                    <RefreshCw className="w-2.5 h-2.5" /> Auto-filled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                    <Zap className="w-2.5 h-2.5" /> Fresh
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700">{r.occupiedBeds ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-gray-700">{r.icuOccupied ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-gray-700">{r.newAdmissionsToday ?? r.newAdmissions ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-gray-700">{r.dischargesToday ?? r.discharges ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-yellow-600 font-medium">{r.fluCases ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-red-600    font-medium">{r.dengueCases ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-purple-600 font-medium">{r.covidCases ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {reports.length > 20 && (
                            <p className="text-center text-xs text-gray-400 py-3">
                                Showing 20 most recent of {reports.length} slots. Export CSV for full dataset.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

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
    red: 'bg-red-100    text-red-700',
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


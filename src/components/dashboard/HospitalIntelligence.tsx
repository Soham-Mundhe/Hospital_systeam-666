/**
 * Hospital Intelligence Panel
 * Real-time KPI cards, bed utilisation gauge, disease distribution,
 * 6-hour trend graph, and emergency load metre — all driven by
 * Firestore onSnapshot listeners (no page refresh needed).
 */

import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { Activity, BedDouble, AlertTriangle, ShieldAlert, Wifi } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientDoc {
    status?: string;
    icuRequired?: boolean;
    diagnosis?: string;
    admissionDate?: string;
    dischargeDate?: string;
}

interface ReportDoc {
    slotId?: string;
    timestamp?: string;
    occupiedBeds?: number;
    icuOccupied?: number;
    fluCases?: number;
    dengueCases?: number;
    covidCases?: number;
    emergencyCases?: number;
    newAdmissions?: number;
    discharges?: number;
    date?: string;
    slot?: string;
}

interface Props {
    facilityId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDate(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCurrent6HourSlot(): string {
    const now = new Date();
    const h = now.getHours();   // LOCAL hours
    const slot = h < 6 ? '00' : h < 12 ? '06' : h < 18 ? '12' : '18';
    return `${localDate(now)}_${slot}`;
}

function getPrev6HourSlot(): string {
    const cur = getCurrent6HourSlot();
    const slotHour = parseInt(cur.slice(-2), 10);
    const date = cur.slice(0, 10);

    if (slotHour === 0) {
        // Roll back to previous day's 18:00 slot
        const prev = new Date(`${date}T00:00:00`);
        prev.setDate(prev.getDate() - 1);
        return `${localDate(prev)}_18`;
    }
    const prevSlot = slotHour === 6 ? '00' : slotHour === 12 ? '06' : '12';
    return `${date}_${prevSlot}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KPICardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: FC<{ className?: string }>;
    colorClass: string;
    bgClass: string;
    pulse?: boolean;
}

const KPICard: FC<KPICardProps> = ({ label, value, sub, icon: Icon, colorClass, bgClass, pulse }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 relative overflow-hidden`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${colorClass}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {pulse && (
            <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
        )}
    </div>
);

// ─── Semi-circular Gauge ──────────────────────────────────────────────────────

const GaugeChart: FC<{ pct: number; label: string }> = ({ pct, label }) => {
    const clamped = Math.min(100, Math.max(0, pct));
    const color = clamped > 85 ? '#ef4444' : clamped > 60 ? '#f59e0b' : '#22c55e';
    // SVG semi-circle arc: M 10 50 A 40 40 0 0 1 90 50
    const r = 40;
    const circ = Math.PI * r; // half circumference
    const offset = circ - (clamped / 100) * circ;

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 100 58" className="w-full max-w-[200px]">
                {/* Track */}
                <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round"
                />
                {/* Fill */}
                <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${circ}`}
                    strokeDashoffset={`${offset}`}
                    style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
                />
                {/* Percentage text */}
                <text x="50" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
                    {clamped.toFixed(0)}%
                </text>
            </svg>
            <p className="text-xs font-semibold text-gray-500 -mt-1 uppercase tracking-wider">{label}</p>
        </div>
    );
};

// ─── Emergency Bar ────────────────────────────────────────────────────────────

const EmergencyMeter: FC<{ count: number; threshold?: number }> = ({ count, threshold = 20 }) => {
    const pct = Math.min(100, (count / threshold) * 100);
    const alert = count >= threshold;
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className={clsx('w-4 h-4', alert ? 'text-red-500 animate-pulse' : 'text-orange-400')} />
                    Emergency Load
                </span>
                <span className={clsx('text-sm font-bold', alert ? 'text-red-600' : 'text-orange-500')}>
                    {count} cases {alert && '⚠ CRITICAL'}
                </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                    className={clsx(
                        'h-3 rounded-full transition-all duration-700',
                        alert ? 'bg-red-500' : pct > 60 ? 'bg-orange-400' : 'bg-emerald-500'
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-xs text-gray-400">Threshold: {threshold} cases — {pct.toFixed(0)}% capacity</p>
        </div>
    );
};

// ─── Risk Badge ───────────────────────────────────────────────────────────────

function computeRisk(icuPct: number, emergency: number, fluCases: number): 'Low' | 'Medium' | 'High' {
    let score = 0;
    if (icuPct > 90) score += 3;
    else if (icuPct > 70) score += 2;
    else score += 1;
    if (emergency > 20) score += 2;
    else if (emergency > 10) score += 1;
    if (fluCases > 10) score += 1;
    if (score >= 5) return 'High';
    if (score >= 3) return 'Medium';
    return 'Low';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const HospitalIntelligence: FC<Props> = ({ facilityId }) => {
    const [patients, setPatients] = useState<PatientDoc[]>([]);
    const [reports, setReports] = useState<Record<string, ReportDoc>>({});
    const [lastSync, setLastSync] = useState<Date>(new Date());
    const [facilityConfig, setFacilityConfig] = useState({
        totalBeds: 0,
        icuBeds: 0,
        emergencyCapacity: 0,
    });

    // ----- Real-time listeners -----
    const unsubs = useRef<Array<() => void>>([]);

    useEffect(() => {
        if (!facilityId) return;

        // 1. Patients listener
        const pUnsub = onSnapshot(
            collection(db, 'facilities', facilityId, 'patients'),
            (snap) => {
                setPatients(snap.docs.map((d) => d.data() as PatientDoc));
                setLastSync(new Date());
            },
            (err) => console.error('[Intelligence] patients:', err)
        );

        // 2. Reports listener
        const rUnsub = onSnapshot(
            query(collection(db, 'facilities', facilityId, 'reports')),
            (snap) => {
                const map: Record<string, ReportDoc> = {};
                snap.docs.forEach((d) => { map[d.id] = { slotId: d.id, ...d.data() } as ReportDoc; });
                setReports(map);
                setLastSync(new Date());
            },
            (err) => console.error('[Intelligence] reports:', err)
        );

        // 3. Facility config listener (totalBeds, icuBeds, emergencyCapacity from Settings)
        const fUnsub = onSnapshot(
            doc(db, 'facilities', facilityId),
            (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    setFacilityConfig({
                        totalBeds: d.totalBeds ?? 0,
                        icuBeds: d.icuBeds ?? 0,
                        emergencyCapacity: d.emergencyCapacity ?? 0,
                    });
                }
                setLastSync(new Date());
            },
            (err) => console.error('[Intelligence] facility config:', err)
        );

        unsubs.current = [pUnsub, rUnsub, fUnsub];
        return () => unsubs.current.forEach((u) => u());
    }, [facilityId]);

    // ── Derived metrics from patients ──────────────────────────────────────────

    const activePatients = patients.filter((p) => p.status === 'admitted' || p.status === 'critical').length;
    const icuOccupied = patients.filter((p) => p.icuRequired === true && (p.status === 'admitted' || p.status === 'critical')).length;
    const emergencyCases = patients.filter((p) => p.status === 'critical').length;

    // Calculate live discharges today
    const todayStr = localDate(new Date());
    const dischargesToday = patients.filter((p) => p.status === 'discharged' && p.dischargeDate === todayStr).length;

    // Pull report data for trend and comparison
    const curSlot = getCurrent6HourSlot();
    const prevSlot = getPrev6HourSlot();
    const curReport = reports[curSlot] ?? {};
    const prevReport = reports[prevSlot] ?? {};

    // Live occupancy metrics
    const occupiedBeds = activePatients;
    const totalBeds = facilityConfig.totalBeds;
    const icuTotal = facilityConfig.icuBeds;
    const bedUtilPct = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
    const icuStressPct = icuTotal > 0 ? (icuOccupied / icuTotal) * 100 : 0;
    const icuStressColor = icuStressPct > 90 ? 'text-red-600' : icuStressPct > 70 ? 'text-yellow-600' : 'text-green-600';
    const icuStressBg = icuStressPct > 90 ? 'bg-red-50' : icuStressPct > 70 ? 'bg-yellow-50' : 'bg-green-50';

    const risk = computeRisk(icuStressPct, emergencyCases, curReport.fluCases ?? 0);
    const riskMeta = {
        Low: { label: '🟢 Low', colorClass: 'text-green-700', bgClass: 'bg-green-50' },
        Medium: { label: '🟡 Medium', colorClass: 'text-yellow-700', bgClass: 'bg-yellow-50' },
        High: { label: '🔴 High', colorClass: 'text-red-700', bgClass: 'bg-red-50' },
    }[risk];

    const availableBeds = Math.max(0, totalBeds - occupiedBeds);

    // ── Disease distribution (current vs prev slot) ────────────────────────────

    const diseaseData = [
        {
            name: 'Flu',
            current: curReport.fluCases ?? 0,
            previous: prevReport.fluCases ?? 0,
        },
        {
            name: 'Dengue',
            current: curReport.dengueCases ?? 0,
            previous: prevReport.dengueCases ?? 0,
        },
        {
            name: 'Covid',
            current: curReport.covidCases ?? 0,
            previous: prevReport.covidCases ?? 0,
        },
        {
            name: 'Emergency',
            current: curReport.emergencyCases ?? 0,
            previous: prevReport.emergencyCases ?? 0,
        },
    ];

    // ── 6-Hour trend (last 8 slots sorted by slotId ascending) ────────────────

    const trendData = Object.values(reports)
        .sort((a, b) => (a.slotId ?? '').localeCompare(b.slotId ?? ''))
        .slice(-8)
        .map((r) => ({
            slot: r.slotId?.slice(5) ?? '',   // show MM-DD_HH
            occupiedBeds: r.occupiedBeds ?? 0,
            icuOccupied: r.icuOccupied ?? 0,
            emergencyCases: r.emergencyCases ?? 0,
        }));

    const syncStr = lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* ── Section header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        Intelligence Center
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Live Firestore sync — slot <span className="font-mono font-semibold text-gray-600">{curSlot}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Last sync <span className="font-mono text-gray-600">{syncStr}</span></span>
                </div>
            </div>

            {/* ── 1. KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Active Patients"
                    value={activePatients}
                    sub="admitted + critical"
                    icon={Activity}
                    colorClass="text-blue-700"
                    bgClass="bg-blue-50"
                />
                <KPICard
                    label="Available Beds"
                    value={availableBeds}
                    sub={`of ${totalBeds} total`}
                    icon={BedDouble}
                    colorClass={availableBeds < 10 ? 'text-red-600' : 'text-emerald-700'}
                    bgClass={availableBeds < 10 ? 'bg-red-50' : 'bg-emerald-50'}
                />
                <KPICard
                    label="ICU Stress Index"
                    value={`${icuStressPct.toFixed(0)}%`}
                    sub={`${icuOccupied} / ${icuTotal} beds`}
                    icon={ShieldAlert}
                    colorClass={icuStressColor}
                    bgClass={icuStressBg}
                    pulse={icuStressPct > 90}
                />
                <KPICard
                    label="Risk Level"
                    value={riskMeta.label}
                    sub="composite score"
                    icon={AlertTriangle}
                    colorClass={riskMeta.colorClass}
                    bgClass={riskMeta.bgClass}
                    pulse={risk === 'High'}
                />
            </div>

            {/* ── 2 & 3. Gauge + Disease Distribution ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bed Utilisation Gauge */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">
                        Bed Utilisation
                    </h3>
                    <GaugeChart pct={bedUtilPct} label="Bed Occupancy" />
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {[
                            { label: 'Occupied', value: occupiedBeds, color: 'text-blue-600' },
                            { label: 'Available', value: availableBeds, color: 'text-emerald-600' },
                            { label: 'ICU Used', value: icuOccupied, color: 'text-purple-600' },
                        ].map((m) => (
                            <div key={m.label} className="bg-gray-50 rounded-xl p-2">
                                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{m.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Disease Distribution */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                        Disease Distribution
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-4">
                        Current slot vs previous slot ({prevSlot.slice(5)})
                    </p>
                    {diseaseData.every((d) => d.current === 0 && d.previous === 0) ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                            <Activity className="w-10 h-10 mb-2" />
                            <p className="text-sm">No report data yet — add patients to generate reports</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={diseaseData} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                    cursor={{ fill: '#f9fafb' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="current" name="Current Slot" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="previous" name="Prev Slot" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── 4. 6-Hour Trend Line ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    6-Hour Trend Line
                </h3>
                <p className="text-[11px] text-gray-400 mb-4">
                    Last {trendData.length} slots — occupied beds, ICU, emergency cases
                </p>
                {trendData.length < 2 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                        <Activity className="w-10 h-10 mb-2" />
                        <p className="text-sm text-center">
                            Trend data builds automatically as patients are added across time slots.
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="slot" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Line type="monotone" dataKey="occupiedBeds" name="Occupied Beds" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="icuOccupied" name="ICU Occupied" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="emergencyCases" name="Emergency Cases" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── 5. Emergency Load Metre ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <EmergencyMeter count={emergencyCases} threshold={20} />
                <div className="grid grid-cols-3 gap-3 mt-5">
                    {[
                        { label: 'New Admissions', value: curReport.newAdmissions ?? 0, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Discharges Today', value: dischargesToday, color: 'bg-emerald-50 text-emerald-700' },
                        { label: 'ICU Occupied', value: icuOccupied, color: icuOccupied > 15 ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700' },
                    ].map((m) => (
                        <div key={m.label} className={`rounded-xl p-3 text-center ${m.color}`}>
                            <p className="text-2xl font-bold">{m.value}</p>
                            <p className="text-[11px] font-medium uppercase tracking-wide mt-0.5 opacity-80">{m.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

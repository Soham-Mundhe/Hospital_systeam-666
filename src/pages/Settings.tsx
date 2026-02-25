import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
    BedDouble, Activity, AlertTriangle, Wind, Cpu,
    Loader2, CheckCircle, Lock, Settings as SettingsIcon
} from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapacityConfig {
    totalBeds: number;
    icuBeds: number;
    emergencyCapacity: number;
    oxygenUnits: number;
    ventilators: number;
}

const DEFAULTS: CapacityConfig = {
    totalBeds: 0,
    icuBeds: 0,
    emergencyCapacity: 0,
    oxygenUnits: 0,
    ventilators: 0,
};

type Role = 'Doctor' | 'Nurse' | 'Admin' | 'Lab Tech';

// ─── Slider + Number input pair ───────────────────────────────────────────────

interface CapacityFieldProps {
    label: string;
    hint: string;
    icon: FC<{ className?: string }>;
    iconColor: string;
    value: number;
    max: number;
    sliderColor: string;  // Tailwind accent class for the styled thumb
    onChange: (v: number) => void;
    error?: string;
}

const CapacityField: FC<CapacityFieldProps> = ({
    label, hint, icon: Icon, iconColor, value, max, onChange, error
}) => {
    const safePct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

    const handleNum = (raw: string) => {
        if (raw === '') { onChange(0); return; }
        const n = parseInt(raw, 10);
        if (isNaN(n)) return;
        onChange(Math.max(0, n));
    };

    return (
        <div className="space-y-3">
            {/* Label row */}
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <Icon className={clsx('w-3.5 h-3.5', iconColor)} />
                    {label}
                </label>
                {/* Number input */}
                <input
                    type="number"
                    value={value === 0 ? '' : value}
                    onChange={(e) => handleNum(e.target.value)}
                    placeholder="0"
                    min={0}
                    max={max || undefined}
                    className={clsx(
                        'w-24 px-2.5 py-1.5 border rounded-lg text-sm text-right font-semibold focus:outline-none focus:ring-2 transition',
                        error
                            ? 'border-red-400 focus:ring-red-300 bg-red-50 text-red-700'
                            : 'border-gray-300 focus:ring-blue-300 focus:border-blue-400 bg-white text-gray-800'
                    )}
                />
            </div>

            {/* Slider */}
            <input
                type="range"
                min={0}
                max={max || 500}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 accent-blue-600"
            />

            {/* Bar fill indicator */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${safePct}%` }}
                />
            </div>

            <div className="flex justify-between items-center">
                <p className="text-[11px] text-gray-400">{hint}</p>
                {max > 0 && (
                    <p className="text-[11px] text-gray-400 font-mono">
                        {safePct.toFixed(0)}% of max
                    </p>
                )}
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
    );
};

// ─── Main Settings Page ───────────────────────────────────────────────────────

export const Settings: FC = () => {
    const { user } = useAuth();
    const [simulatedRole, setSimulatedRole] = useState<Role>('Admin');
    const [form, setForm] = useState<CapacityConfig>(DEFAULTS);
    const [saved, setSaved] = useState<CapacityConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Real-time listener on facility doc
    useEffect(() => {
        if (!user?.facilityId) return;
        const unsub = onSnapshot(
            doc(db, 'facilities', user.facilityId),
            (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    const cfg: CapacityConfig = {
                        totalBeds: d.totalBeds ?? 0,
                        icuBeds: d.icuBeds ?? 0,
                        emergencyCapacity: d.emergencyCapacity ?? 0,
                        oxygenUnits: d.oxygenUnits ?? 0,
                        ventilators: d.ventilators ?? 0,
                    };
                    setForm(cfg);
                    setSaved(cfg);
                }
            },
            (err) => console.error('[Settings] snapshot:', err)
        );
        return () => unsub();
    }, [user?.facilityId]);

    if (!user) return null;

    // ── Validation ────────────────────────────────────────────────────────────

    const icuExceedsTotal = form.icuBeds > form.totalBeds && form.totalBeds > 0;
    const hasErrors = icuExceedsTotal;

    // ── Handlers ─────────────────────────────────────────────────────────────

    const setField = (key: keyof CapacityConfig, val: number) => {
        setForm((prev) => ({ ...prev, [key]: val }));
        setSuccess(false);
        setSaveError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (simulatedRole !== 'Admin' || hasErrors) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            await setDoc(
                doc(db, 'facilities', user.facilityId),
                { ...form, updatedAt: new Date().toISOString() },
                { merge: true }
            );
            setSaved({ ...form });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000);
        } catch (err) {
            console.error('[Settings] save error:', err);
            setSaveError('Save failed. Check your connection and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const isDirty = JSON.stringify(form) !== JSON.stringify(saved ?? DEFAULTS);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 max-w-2xl mx-auto">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <SettingsIcon className="w-6 h-6 text-blue-600" />
                        Settings
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Facility: <span className="font-semibold text-gray-600">{user.facilityId}</span>
                    </p>
                </div>

                {/* Role simulator — hospital only */}
                {user.facilityType === 'hospital' && (
                    <div className="flex flex-col gap-1 items-end">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Role (sim)
                        </label>
                        <select
                            value={simulatedRole}
                            onChange={(e) => setSimulatedRole(e.target.value as Role)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                        >
                            <option>Doctor</option>
                            <option>Nurse</option>
                            <option>Admin</option>
                            <option>Lab Tech</option>
                        </select>
                    </div>
                )}
            </div>

            {/* ── Hospital — Admin view ─────────────────────────────────────── */}
            {user.facilityType === 'hospital' ? (
                simulatedRole === 'Admin' ? (
                    <form onSubmit={handleSave} className="space-y-6">

                        {/* ╔═══════════════════════════════════╗
                            ║  Hospital Capacity Settings Card  ║
                            ╚═══════════════════════════════════╝ */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                            {/* Card header */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                                    <BedDouble className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-800">Hospital Capacity Settings</h2>
                                    <p className="text-xs text-gray-400">
                                        Saved values update dashboard KPIs in real time via Firestore.
                                    </p>
                                </div>
                            </div>

                            {/* ── Primary fields: Total Beds + ICU Beds ── */}
                            <div className="p-6 space-y-7">
                                <CapacityField
                                    label="Total Beds"
                                    hint="Overall physical bed capacity of the hospital"
                                    icon={BedDouble}
                                    iconColor="text-blue-600"
                                    value={form.totalBeds}
                                    max={500}
                                    sliderColor="accent-blue-600"
                                    onChange={(v) => {
                                        setField('totalBeds', v);
                                        // Auto-clamp ICU if it exceeds new total
                                        if (form.icuBeds > v) setField('icuBeds', v);
                                    }}
                                />

                                <div className="border-t border-dashed border-gray-100 pt-6">
                                    <CapacityField
                                        label="ICU Beds"
                                        hint="Critical care / ICU capacity — cannot exceed Total Beds"
                                        icon={Activity}
                                        iconColor="text-purple-600"
                                        value={form.icuBeds}
                                        max={form.totalBeds || 500}
                                        sliderColor="accent-purple-600"
                                        onChange={(v) => setField('icuBeds', Math.min(v, form.totalBeds || v))}
                                        error={icuExceedsTotal ? `ICU Beds (${form.icuBeds}) cannot exceed Total Beds (${form.totalBeds})` : undefined}
                                    />
                                </div>
                            </div>

                            {/* ── Secondary resources ── */}
                            <div className="px-6 pb-6">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
                                    Additional Resources
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    {([
                                        { key: 'emergencyCapacity' as const, label: 'Emergency Capacity', icon: AlertTriangle, color: 'text-orange-500', max: 100 },
                                        { key: 'oxygenUnits' as const, label: 'Oxygen Units', icon: Wind, color: 'text-cyan-500', max: 500 },
                                        { key: 'ventilators' as const, label: 'Ventilators', icon: Cpu, color: 'text-rose-500', max: 50 },
                                    ]).map(({ key, label, icon: Icon, color, max }) => (
                                        <div key={key}>
                                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                                <Icon className={clsx('w-3 h-3', color)} />
                                                {label}
                                            </label>
                                            <input
                                                type="number"
                                                value={form[key] === 0 ? '' : form[key]}
                                                onChange={(e) => {
                                                    const n = parseInt(e.target.value, 10);
                                                    setField(key, isNaN(n) ? 0 : Math.max(0, n));
                                                }}
                                                placeholder="0"
                                                min={0}
                                                max={max}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Feedback banners ── */}
                            {saveError && (
                                <div className="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                                    {saveError}
                                </div>
                            )}
                            {success && (
                                <div className="mx-6 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 shrink-0" />
                                    Saved! Dashboard KPIs will now reflect the new capacity.
                                </div>
                            )}

                            {/* ── Footer / Save button ── */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                                <p className="text-[11px] text-gray-400 font-mono">
                                    facilities/<span className="text-gray-600">{user.facilityId}</span>
                                </p>
                                <button
                                    type="submit"
                                    disabled={isSaving || !isDirty || hasErrors}
                                    className={clsx(
                                        'flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all',
                                        isSaving || !isDirty || hasErrors
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-200'
                                    )}
                                >
                                    {isSaving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                                    ) : (
                                        'Save Capacity'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ── Live summary strip (only after first save) ── */}
                        {(saved?.totalBeds ?? 0) > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                    Currently active in dashboard
                                </p>
                                <div className="grid grid-cols-5 gap-3">
                                    {([
                                        { key: 'totalBeds' as const, label: 'Total Beds', icon: BedDouble, color: 'text-blue-600' },
                                        { key: 'icuBeds' as const, label: 'ICU Beds', icon: Activity, color: 'text-purple-600' },
                                        { key: 'emergencyCapacity' as const, label: 'Emergency', icon: AlertTriangle, color: 'text-orange-500' },
                                        { key: 'oxygenUnits' as const, label: 'O₂ Units', icon: Wind, color: 'text-cyan-500' },
                                        { key: 'ventilators' as const, label: 'Ventilators', icon: Cpu, color: 'text-rose-500' },
                                    ]).map(({ key, label, icon: Icon, color }) => (
                                        <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                                            <Icon className={clsx('w-4 h-4 mx-auto mb-1', color)} />
                                            <p className="text-lg font-bold text-gray-800">{saved?.[key] ?? 0}</p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight mt-0.5">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </form>
                ) : (
                    /* Non-Admin lock screen */
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                            <Lock className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-700 text-lg">Admin Access Required</h3>
                            <p className="text-sm text-gray-400 max-w-xs mt-1">
                                Capacity settings can only be modified by an <strong>Admin</strong>.
                                Use the role simulator above to switch.
                            </p>
                        </div>
                    </div>
                )
            ) : (
                /* Non-hospital facilities */
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center text-center gap-3">
                    <SettingsIcon className="w-12 h-12 text-gray-200" />
                    <p className="text-sm text-gray-400">Settings are only available for Hospital facilities.</p>
                </div>
            )}
        </div>
    );
};

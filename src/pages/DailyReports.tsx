import { useState } from 'react';
import type { FC } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
    Calendar, BedDouble, Activity, AlertTriangle,
    Wind, Droplets, Thermometer, UserCheck, UserMinus,
    Clock, Loader2, CheckCircle, ClipboardList
} from 'lucide-react';

interface ReportForm {
    date: string;
    totalBeds: string;
    occupiedBeds: string;
    icuBeds: string;
    icuOccupied: string;
    emergencyCases: string;
    fluCases: string;
    covidCases: string;
    dengueCases: string;
    newAdmissions: string;
    discharges: string;
    avgTreatmentDays: string;
}

const today = new Date().toISOString().split('T')[0];

const initialForm: ReportForm = {
    date: today,
    totalBeds: '',
    occupiedBeds: '',
    icuBeds: '',
    icuOccupied: '',
    emergencyCases: '',
    fluCases: '',
    covidCases: '',
    dengueCases: '',
    newAdmissions: '',
    discharges: '',
    avgTreatmentDays: '',
};

interface FieldConfig {
    key: keyof ReportForm;
    label: string;
    icon: FC<{ className?: string }>;
    color: string;
    placeholder: string;
    hint?: string;
}

const fields: FieldConfig[] = [
    { key: 'totalBeds', label: 'Total Beds', icon: BedDouble, color: 'text-slate-600', placeholder: 'e.g. 200', hint: 'Total bed capacity' },
    { key: 'occupiedBeds', label: 'Occupied Beds', icon: BedDouble, color: 'text-blue-600', placeholder: 'e.g. 140', hint: 'Currently occupied' },
    { key: 'icuBeds', label: 'ICU Beds', icon: Activity, color: 'text-purple-600', placeholder: 'e.g. 20', hint: 'Total ICU capacity' },
    { key: 'icuOccupied', label: 'ICU Occupied', icon: Activity, color: 'text-red-600', placeholder: 'e.g. 14', hint: 'Occupied ICU beds' },
    { key: 'emergencyCases', label: 'Emergency Cases', icon: AlertTriangle, color: 'text-orange-600', placeholder: 'e.g. 8' },
    { key: 'fluCases', label: 'Flu Cases', icon: Wind, color: 'text-cyan-600', placeholder: 'e.g. 12' },
    { key: 'covidCases', label: 'Covid Cases', icon: Droplets, color: 'text-rose-600', placeholder: 'e.g. 3' },
    { key: 'dengueCases', label: 'Dengue Cases', icon: Thermometer, color: 'text-yellow-600', placeholder: 'e.g. 5' },
    { key: 'newAdmissions', label: 'New Admissions', icon: UserCheck, color: 'text-green-600', placeholder: 'e.g. 18' },
    { key: 'discharges', label: 'Discharges', icon: UserMinus, color: 'text-teal-600', placeholder: 'e.g. 15' },
    { key: 'avgTreatmentDays', label: 'Avg. Treatment Days', icon: Clock, color: 'text-indigo-600', placeholder: 'e.g. 4.5', hint: 'Average stay in days' },
];

export const DailyReports: FC = () => {
    const { user } = useAuth();
    const [form, setForm] = useState<ReportForm>(initialForm);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!user) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setSuccess(false);
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.date) {
            setError('Please select a date for the report.');
            return;
        }
        setIsSaving(true);
        setError(null);

        try {
            const docRef = doc(db, 'facilities', user.facilityId, 'reports', form.date);
            await setDoc(docRef, {
                date: form.date,
                totalBeds: form.totalBeds ? Number(form.totalBeds) : null,
                occupiedBeds: form.occupiedBeds ? Number(form.occupiedBeds) : null,
                icuBeds: form.icuBeds ? Number(form.icuBeds) : null,
                icuOccupied: form.icuOccupied ? Number(form.icuOccupied) : null,
                emergencyCases: form.emergencyCases ? Number(form.emergencyCases) : null,
                fluCases: form.fluCases ? Number(form.fluCases) : null,
                covidCases: form.covidCases ? Number(form.covidCases) : null,
                dengueCases: form.dengueCases ? Number(form.dengueCases) : null,
                newAdmissions: form.newAdmissions ? Number(form.newAdmissions) : null,
                discharges: form.discharges ? Number(form.discharges) : null,
                avgTreatmentDays: form.avgTreatmentDays ? Number(form.avgTreatmentDays) : null,
                facilityId: user.facilityId,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setSuccess(true);
        } catch (err) {
            console.error('Firestore error:', err);
            setError('Failed to save report. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Compute occupancy % for a quick visual
    const occupancyPct =
        form.totalBeds && form.occupiedBeds
            ? Math.round((Number(form.occupiedBeds) / Number(form.totalBeds)) * 100)
            : null;
    const icuPct =
        form.icuBeds && form.icuOccupied
            ? Math.round((Number(form.icuOccupied) / Number(form.icuBeds)) * 100)
            : null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-primary" />
                        Daily Summary Report
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Submit end-of-day statistics for <span className="font-semibold text-gray-700">{user.facilityId}</span>.
                        Each date's report is overwritten on re-save.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Date Picker Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Report Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        max={today}
                        className="w-full sm:w-72 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                    />
                    {form.date && (
                        <p className="text-xs text-gray-400 mt-2">
                            Firestore path: <span className="font-mono text-gray-600">facilities/{user.facilityId}/reports/<strong>{form.date}</strong></span>
                        </p>
                    )}
                </div>

                {/* Occupancy Live Preview */}
                {(occupancyPct !== null || icuPct !== null) && (
                    <div className="grid grid-cols-2 gap-4">
                        {occupancyPct !== null && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Bed Occupancy</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-blue-700">{occupancyPct}%</span>
                                    <span className="text-sm text-blue-500 mb-0.5">{form.occupiedBeds}/{form.totalBeds}</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${occupancyPct > 90 ? 'bg-red-500' : occupancyPct > 70 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {icuPct !== null && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-1">ICU Occupancy</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-purple-700">{icuPct}%</span>
                                    <span className="text-sm text-purple-500 mb-0.5">{form.icuOccupied}/{form.icuBeds}</span>
                                </div>
                                <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${icuPct > 90 ? 'bg-red-500' : icuPct > 70 ? 'bg-orange-500' : 'bg-purple-500'}`}
                                        style={{ width: `${Math.min(icuPct, 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Fields Grid */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-4">Daily Statistics</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fields.map(({ key, label, icon: Icon, color, placeholder, hint }) => (
                            <div key={key}>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                                    {label}
                                </label>
                                <input
                                    type="number"
                                    name={key}
                                    value={form[key]}
                                    onChange={handleChange}
                                    placeholder={placeholder}
                                    min={0}
                                    step={key === 'avgTreatmentDays' ? '0.1' : '1'}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                                />
                                {hint && (
                                    <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feedback */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>
                            Report for <strong>{form.date}</strong> saved successfully under{' '}
                            <code className="font-mono text-xs bg-green-100 px-1 rounded">
                                facilities/{user.facilityId}/reports/{form.date}
                            </code>
                        </span>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pb-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold rounded-xl shadow-sm transition-all text-sm"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving Report…
                            </>
                        ) : (
                            <>
                                <ClipboardList className="w-4 h-4" />
                                Save Report
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

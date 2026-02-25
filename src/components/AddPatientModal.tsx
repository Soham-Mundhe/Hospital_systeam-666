import { useState } from 'react';
import type { FC } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { update6HourReport } from '../utils/reporting';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface Props {
    facilityId: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormState {
    patientId: string;
    name: string;
    age: string;
    gender: string;
    ward: string;
    admissionDate: string;
    diagnosis: string;
    status: 'admitted' | 'critical' | 'discharged';
    icuRequired: boolean;
    oxygenRequired: boolean;
    lengthOfStay: string;
}

const initialForm: FormState = {
    patientId: '',
    name: '',
    age: '',
    gender: 'Male',
    ward: '',
    admissionDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    status: 'admitted',
    icuRequired: false,
    oxygenRequired: false,
    lengthOfStay: '',
};

export const AddPatientModal: FC<Props> = ({ facilityId, onClose, onSuccess }) => {
    const [form, setForm] = useState<FormState>(initialForm);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleToggle = (field: 'icuRequired' | 'oxygenRequired') => {
        setForm((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.patientId || !form.name || !form.age || !form.diagnosis) {
            setError('Please fill in all required fields (Patient ID, Name, Age, Diagnosis).');
            return;
        }

        setIsSaving(true);
        try {
            const colRef = collection(db, 'facilities', facilityId, 'patients');
            await addDoc(colRef, {
                patientId: form.patientId.trim(),
                name: form.name.trim(),
                age: Number(form.age),
                gender: form.gender,
                ward: form.ward.trim(),
                admissionDate: form.admissionDate,
                diagnosis: form.diagnosis.trim().toLowerCase(),
                status: form.status,
                icuRequired: form.icuRequired,
                oxygenRequired: form.oxygenRequired,
                lengthOfStay: form.lengthOfStay ? Number(form.lengthOfStay) : null,
                createdAt: serverTimestamp(),
            });

            // Trigger automatic 6-hour aggregated report (fire-and-forget)
            // Also pass admissionDate so a slot is created for past dates
            update6HourReport(facilityId, form.admissionDate).catch(console.error);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Firestore error:', err);
            setError('Failed to save patient. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Add New Patient</h2>
                            <p className="text-xs text-gray-400">Facility: {facilityId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    {/* Row 1: Patient ID & Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Patient ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="patientId"
                                value={form.patientId}
                                onChange={handleChange}
                                placeholder="e.g. P-0042"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Patient full name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Row 2: Age, Gender, Ward */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Age <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="age"
                                value={form.age}
                                onChange={handleChange}
                                placeholder="e.g. 45"
                                min={0}
                                max={130}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Gender
                            </label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Ward
                            </label>
                            <input
                                type="text"
                                name="ward"
                                value={form.ward}
                                onChange={handleChange}
                                placeholder="e.g. General A"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Row 3: Admission Date & Length of Stay */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Admission Date
                            </label>
                            <input
                                type="date"
                                name="admissionDate"
                                value={form.admissionDate}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Length of Stay (days)
                            </label>
                            <input
                                type="number"
                                name="lengthOfStay"
                                value={form.lengthOfStay}
                                onChange={handleChange}
                                placeholder="e.g. 5"
                                min={0}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Diagnosis */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Diagnosis <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="diagnosis"
                            value={form.diagnosis}
                            onChange={handleChange}
                            placeholder="Primary diagnosis or presenting complaint..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Status
                        </label>
                        <div className="flex gap-2">
                            {(['admitted', 'critical', 'discharged'] as const).map((s) => (
                                <button
                                    type="button"
                                    key={s}
                                    onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${form.status === s
                                        ? s === 'admitted'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : s === 'critical'
                                                ? 'bg-red-600 text-white border-red-600'
                                                : 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex gap-4">
                        {/* ICU Required */}
                        <button
                            type="button"
                            onClick={() => handleToggle('icuRequired')}
                            className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${form.icuRequired
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <span className={`text-sm font-semibold ${form.icuRequired ? 'text-purple-700' : 'text-gray-500'}`}>
                                🏥 ICU Required
                            </span>
                            <div
                                className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.icuRequired ? 'bg-purple-500' : 'bg-gray-300'
                                    }`}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.icuRequired ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </div>
                        </button>

                        {/* Oxygen Required */}
                        <button
                            type="button"
                            onClick={() => handleToggle('oxygenRequired')}
                            className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${form.oxygenRequired
                                ? 'border-cyan-500 bg-cyan-50'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <span className={`text-sm font-semibold ${form.oxygenRequired ? 'text-cyan-700' : 'text-gray-500'}`}>
                                💨 Oxygen Required
                            </span>
                            <div
                                className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.oxygenRequired ? 'bg-cyan-500' : 'bg-gray-300'
                                    }`}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.oxygenRequired ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </div>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Patient'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

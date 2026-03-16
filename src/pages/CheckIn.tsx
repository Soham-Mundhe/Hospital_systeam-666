/**
 * CheckIn — Patient-Facing Portal Page
 *
 * This page is opened when a patient scans the QR code.
 * It reads the `?facility=` query param and submits patient data to Firestore.
 * For the prototype, the form is pre-filled with example patient data.
 *
 * Route: /checkin (public, no auth required)
 */

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { QrCode, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface CheckInForm {
    patient_id: string;
    name: string;
    age: string;
    gender: string;
    disease: string;
    previous_admissions: string;
    medications: string;
    blood_pressure: string;
    glucose_level: string;
    visit_date: string;
}

// Sample patient data for prototype demonstration
const SAMPLE_DATA: CheckInForm = {
    patient_id: `P-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    name: 'Rahul Sharma',
    age: '34',
    gender: 'Male',
    disease: 'Fever',
    previous_admissions: '1',
    medications: 'Paracetamol 500mg',
    blood_pressure: '120/80',
    glucose_level: '95 mg/dL',
    visit_date: new Date().toISOString().slice(0, 10),
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export const CheckIn: FC = () => {
    const [searchParams] = useSearchParams();
    const facilityId = searchParams.get('facility') ?? '';

    const [form, setForm] = useState<CheckInForm>(SAMPLE_DATA);
    const [status, setStatus] = useState<Status>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    // Regenerate a fresh patient ID each time the page loads (simulate new patient)
    useEffect(() => {
        setForm(prev => ({
            ...prev,
            patient_id: `P-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        }));
    }, []);

    const handleChange = (field: keyof CheckInForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!facilityId) {
            setErrorMsg('No facility ID provided. Please scan the QR code again.');
            setStatus('error');
            return;
        }

        setStatus('submitting');
        try {
            await addDoc(collection(db, 'facilities', facilityId, 'checkins'), {
                patient_id: form.patient_id,
                name: form.name.trim(),
                age: Number(form.age),
                gender: form.gender,
                disease: form.disease.trim(),
                previous_admissions: Number(form.previous_admissions),
                medications: form.medications.trim(),
                blood_pressure: form.blood_pressure.trim(),
                glucose_level: form.glucose_level.trim(),
                visit_date: form.visit_date,
                createdAt: serverTimestamp(),
            });
            setStatus('success');
        } catch (err) {
            console.error('[CheckIn] submit error:', err);
            setErrorMsg('Something went wrong. Please try again.');
            setStatus('error');
        }
    };

    // ── Success screen ────────────────────────────────────────────────────────
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center flex flex-col items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Check-In Successful!</h1>
                        <p className="text-sm text-gray-500 mt-2">
                            Your information has been sent to the hospital. The medical team will attend to you shortly.
                        </p>
                    </div>
                    <div className="text-xs text-gray-400 font-mono bg-gray-50 rounded-xl px-4 py-2 w-full">
                        Patient ID: <span className="font-bold text-gray-700">{form.patient_id}</span>
                    </div>
                    <p className="text-xs text-gray-400">Please wait for a staff member to call your name.</p>
                </div>
            </div>
        );
    }

    // ── Form screen ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-start justify-center p-4 pt-8">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-blue-600 px-8 py-7 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Patient Check-In</h1>
                        <p className="text-teal-100 text-xs mt-0.5">
                            {facilityId ? `Facility: ${facilityId}` : 'Please scan the QR code from the hospital'}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    <p className="text-xs text-gray-500 mb-2">
                        Please verify your details before submitting. This information will be sent directly to the hospital team.
                    </p>

                    {/* Error */}
                    {status === 'error' && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Patient ID (read-only) */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient ID</label>
                        <input
                            id="checkin-patient-id"
                            type="text"
                            value={form.patient_id}
                            readOnly
                            className="w-full font-mono text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-600 cursor-not-allowed"
                        />
                    </div>

                    {/* 2-col row */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field id="checkin-name" label="Full Name" value={form.name} onChange={v => handleChange('name', v)} required />
                        <Field id="checkin-age" label="Age" value={form.age} type="number" min="0" max="120" onChange={v => handleChange('age', v)} required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <SelectField
                            id="checkin-gender"
                            label="Gender"
                            value={form.gender}
                            options={['Male', 'Female', 'Other']}
                            onChange={v => handleChange('gender', v)}
                        />
                        <Field id="checkin-visit-date" label="Visit Date" value={form.visit_date} type="date" onChange={v => handleChange('visit_date', v)} required />
                    </div>

                    <Field id="checkin-disease" label="Disease / Complaint" value={form.disease} onChange={v => handleChange('disease', v)} required />

                    <div className="grid grid-cols-2 gap-3">
                        <Field id="checkin-bp" label="Blood Pressure" value={form.blood_pressure} placeholder="120/80" onChange={v => handleChange('blood_pressure', v)} />
                        <Field id="checkin-glucose" label="Glucose Level" value={form.glucose_level} placeholder="95 mg/dL" onChange={v => handleChange('glucose_level', v)} />
                    </div>

                    <Field id="checkin-medications" label="Current Medications" value={form.medications} onChange={v => handleChange('medications', v)} />

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Previous Admissions</label>
                        <input
                            id="checkin-prev-admissions"
                            type="number"
                            min="0"
                            value={form.previous_admissions}
                            onChange={e => handleChange('previous_admissions', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                        />
                    </div>

                    <button
                        id="checkin-submit"
                        type="submit"
                        disabled={status === 'submitting' || !facilityId}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-2xl text-sm transition shadow-md mt-2"
                    >
                        {status === 'submitting' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting…
                            </>
                        ) : (
                            'Submit Check-In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ── Helper sub-components ─────────────────────────────────────────────────────

interface FieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    min?: string;
    max?: string;
}

const Field: FC<FieldProps> = ({ id, label, value, onChange, type = 'text', placeholder, required, min, max }) => (
    <div className="space-y-1">
        <label htmlFor={id} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            min={min}
            max={max}
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
        />
    </div>
);

interface SelectFieldProps {
    id: string;
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
}

const SelectField: FC<SelectFieldProps> = ({ id, label, value, options, onChange }) => (
    <div className="space-y-1">
        <label htmlFor={id} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
        <select
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 transition bg-white"
        >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

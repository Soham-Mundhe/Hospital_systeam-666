/**
 * PatientDetailModal
 *
 * Full patient profile shown when clicking "View Full Record" or the eye icon.
 * Fetches the patient document from Firestore and renders a complete timeline
 * from admission to current status / discharge.
 */

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    X, User, Calendar, Activity, BedDouble, Thermometer,
    Wind, Clock, Stethoscope, AlertTriangle, CheckCircle2,
    Loader2, Hash, HeartPulse
} from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
    facilityId: string;
    patientDocId: string;   // Firestore document id in patients collection
    onClose: () => void;
}

interface PatientDoc {
    id: string;
    patientId?: string;
    name?: string;
    age?: number;
    gender?: string;
    ward?: string;
    status?: string;
    diagnosis?: string;
    admissionDate?: string;
    symptoms?: string[];
    icuRequired?: boolean;
    oxygenRequired?: boolean;
    lengthOfStay?: number;
    createdAt?: { seconds: number; nanoseconds: number } | string;
    updatedAt?: { seconds: number; nanoseconds: number } | string;
    dischargeDate?: string;
}

function formatTs(ts: PatientDoc['createdAt']): string {
    if (!ts) return '—';
    if (typeof ts === 'string') return ts;
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function daysAgo(ts: PatientDoc['createdAt'], admDate?: string): number {
    let base: Date;
    if (ts && typeof ts !== 'string') {
        base = new Date(ts.seconds * 1000);
    } else if (admDate) {
        base = new Date(admDate);
    } else {
        return 0;
    }
    return Math.floor((Date.now() - base.getTime()) / 86_400_000);
}

const statusColors: Record<string, string> = {
    admitted: 'bg-blue-100 text-blue-700 border-blue-200',
    critical: 'bg-red-100  text-red-700  border-red-200',
    discharged: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export const PatientDetailModal: FC<Props> = ({ facilityId, patientDocId, onClose }) => {
    const [patient, setPatient] = useState<PatientDoc | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        getDoc(doc(db, 'facilities', facilityId, 'patients', patientDocId))
            .then(snap => {
                if (snap.exists()) {
                    setPatient({ id: snap.id, ...snap.data() } as PatientDoc);
                } else {
                    setError('Patient record not found.');
                }
            })
            .catch(() => setError('Failed to load patient record.'))
            .finally(() => setIsLoading(false));
    }, [facilityId, patientDocId]);

    const stay = patient ? daysAgo(patient.createdAt, patient.admissionDate) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {patient?.name ?? 'Patient Full Record'}
                            </h2>
                            <p className="text-xs text-gray-400">
                                {patient?.patientId ?? patientDocId} · Complete Medical Record
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                            <p className="text-sm">Loading patient record…</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {patient && !isLoading && (
                        <>
                            {/* ── Identity card ── */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <InfoBox icon={<Hash className="w-4 h-4" />} label="Patient ID" value={patient.patientId ?? patient.id} />
                                <InfoBox icon={<User className="w-4 h-4" />} label="Age / Gender" value={`${patient.age ?? '—'} yrs · ${patient.gender ?? '—'}`} />
                                <InfoBox icon={<BedDouble className="w-4 h-4" />} label="Ward / Bed" value={patient.ward || '—'} />
                                <InfoBox
                                    icon={<Activity className="w-4 h-4" />}
                                    label="Status"
                                    value={
                                        <span className={clsx(
                                            'inline-block px-2 py-0.5 rounded-full text-xs font-semibold border capitalize',
                                            statusColors[patient.status ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                                        )}>
                                            {patient.status ?? '—'}
                                        </span>
                                    }
                                />
                            </div>

                            {/* ── Diagnosis & Symptoms ── */}
                            <Section title="Diagnosis & Symptoms" icon={<Stethoscope className="w-4 h-4 text-blue-500" />}>
                                {patient.diagnosis && (
                                    <div className="mb-3 p-3 bg-blue-50 rounded-xl">
                                        <p className="text-xs text-gray-400 mb-1">Primary Diagnosis</p>
                                        <p className="font-semibold text-blue-800 capitalize">{patient.diagnosis}</p>
                                    </div>
                                )}
                                {(patient.symptoms ?? []).length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {patient.symptoms!.map((s, i) => (
                                            <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                                                <Thermometer className="w-3 h-3 text-orange-400" /> {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {!patient.diagnosis && (patient.symptoms ?? []).length === 0 && (
                                    <p className="text-sm text-gray-400">No diagnosis or symptoms recorded.</p>
                                )}
                            </Section>

                            {/* ── Requirements ── */}
                            {(patient.icuRequired || patient.oxygenRequired) && (
                                <Section title="Special Requirements" icon={<HeartPulse className="w-4 h-4 text-red-500" />}>
                                    <div className="flex gap-3">
                                        {patient.icuRequired && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl">
                                                <Activity className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm font-semibold text-purple-700">ICU Required</span>
                                            </div>
                                        )}
                                        {patient.oxygenRequired && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-xl">
                                                <Wind className="w-4 h-4 text-cyan-500" />
                                                <span className="text-sm font-semibold text-cyan-700">Oxygen Required</span>
                                            </div>
                                        )}
                                    </div>
                                </Section>
                            )}

                            {/* ── Admission Timeline ── */}
                            <Section title="Patient Timeline" icon={<Clock className="w-4 h-4 text-green-500" />}>
                                <div className="relative pl-5">
                                    <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200 rounded-full" />

                                    {/* Event: Admission */}
                                    <TimelineEvent
                                        dotColor="bg-green-500"
                                        title="Patient Admitted"
                                        time={
                                            patient.createdAt
                                                ? formatTs(patient.createdAt)
                                                : patient.admissionDate ?? '—'
                                        }
                                        detail={`Ward: ${patient.ward || '—'} · ${patient.icuRequired ? 'ICU Assignment' : 'General Ward'}`}
                                        icon={<CheckCircle2 className="w-3 h-3" />}
                                    />

                                    {/* Event: Diagnosis recorded */}
                                    {patient.diagnosis && (
                                        <TimelineEvent
                                            dotColor="bg-blue-500"
                                            title="Diagnosis Recorded"
                                            time={patient.admissionDate ?? '—'}
                                            detail={patient.diagnosis}
                                            icon={<Stethoscope className="w-3 h-3" />}
                                        />
                                    )}

                                    {/* Event: ICU required */}
                                    {patient.icuRequired && (
                                        <TimelineEvent
                                            dotColor="bg-purple-500"
                                            title="Transferred to ICU"
                                            time={patient.admissionDate ?? '—'}
                                            detail="Patient requires intensive care monitoring"
                                            icon={<Activity className="w-3 h-3" />}
                                        />
                                    )}

                                    {/* Event: Current status */}
                                    {patient.status === 'critical' && (
                                        <TimelineEvent
                                            dotColor="bg-red-500 animate-pulse"
                                            title="Status: Critical"
                                            time="Current"
                                            detail="Patient is in critical condition — close monitoring required"
                                            icon={<AlertTriangle className="w-3 h-3" />}
                                        />
                                    )}

                                    {/* Event: Discharged */}
                                    {patient.status === 'discharged' && (
                                        <TimelineEvent
                                            dotColor="bg-green-500"
                                            title="Patient Discharged"
                                            time={patient.dischargeDate ?? 'Completed'}
                                            detail={`Total stay: ${stay} day${stay !== 1 ? 's' : ''}`}
                                            icon={<CheckCircle2 className="w-3 h-3" />}
                                        />
                                    )}

                                    {/* Currently admitted marker */}
                                    {patient.status === 'admitted' && (
                                        <TimelineEvent
                                            dotColor="bg-blue-400 animate-pulse"
                                            title="Currently Admitted"
                                            time={`Day ${stay} of stay`}
                                            detail={`Length of stay: ${patient.lengthOfStay ? `${patient.lengthOfStay} planned days` : `${stay} day${stay !== 1 ? 's' : ''} so far`}`}
                                            icon={<BedDouble className="w-3 h-3" />}
                                        />
                                    )}
                                </div>
                            </Section>

                            {/* ── Admission Summary ── */}
                            <Section title="Admission Summary" icon={<Calendar className="w-4 h-4 text-orange-500" />}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <InfoBox label="Admission Date" value={patient.admissionDate ?? '—'} icon={<Calendar className="w-4 h-4" />} />
                                    <InfoBox label="Registered At" value={formatTs(patient.createdAt)} icon={<Clock className="w-4 h-4" />} />
                                    <InfoBox label="Length of Stay" value={
                                        patient.lengthOfStay
                                            ? `${patient.lengthOfStay} days (planned)`
                                            : `${stay} day${stay !== 1 ? 's' : ''}`
                                    } icon={<Clock className="w-4 h-4" />} />
                                </div>
                            </Section>
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const Section: FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div>
        <div className="flex items-center gap-2 mb-3">
            {icon}
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

const InfoBox: FC<{ label: string; value: React.ReactNode; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
            {icon} {label}
        </div>
        <div className="font-semibold text-gray-800 text-sm">{value}</div>
    </div>
);

const TimelineEvent: FC<{
    dotColor: string;
    title: string;
    time: string;
    detail: string;
    icon: React.ReactNode;
}> = ({ dotColor, title, time, detail, icon }) => (
    <div className="relative mb-5 last:mb-0">
        <div className={clsx('absolute -left-3 top-1 w-4 h-4 rounded-full flex items-center justify-center text-white', dotColor)}>
            {icon}
        </div>
        <div className="ml-3">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{time}</p>
            <p className="text-xs text-gray-600 mt-1">{detail}</p>
        </div>
    </div>
);

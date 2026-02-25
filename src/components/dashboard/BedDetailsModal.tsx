import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { update6HourReport } from '../../utils/reporting';
import { X, User, Activity, Calendar, AlertCircle, CheckCircle2, Clock, Loader2, BedDouble, Thermometer } from 'lucide-react';
import type { Bed, Patient } from '../../types';
import { clsx } from 'clsx';

export interface BedDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed | null;
    patient?: Patient | null;          // kept for backward compat — ignored if bed has patientId
    onAssign: (bedId: string, patientData: Omit<Patient, 'id' | 'admissionDate' | 'status'>) => void;
    onDischarge: (bedId: string) => void;
    onClean: (bedId: string) => void;
    onViewRecord?: (patientId: string) => void;
}

interface FirestorePatient {
    id: string;
    name?: string;
    age?: number;
    gender?: string;
    status?: string;
    ward?: string;
    diagnosis?: string;
    admissionDate?: string;
    symptoms?: string[];
    icuRequired?: boolean;
    oxygenRequired?: boolean;
}

export const BedDetailsModal = ({
    isOpen,
    onClose,
    bed,
    onAssign,
    onDischarge,
    onClean,
    onViewRecord,
}: BedDetailsModalProps) => {
    const { user } = useAuth();

    // Live patient data fetched from Firestore when bed is occupied
    const [livePatient, setLivePatient] = useState<FirestorePatient | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [isDischarging, setIsDischarging] = useState(false);

    // Form state for admitting a new patient to an available bed
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'M',
        symptoms: '',
        ward: '',
    });

    // ── Fetch patient from Firestore when an occupied bed is selected ──────────
    useEffect(() => {
        if (!isOpen || !bed || !user?.facilityId) return;

        setFormData(prev => ({ ...prev, ward: `${bed.ward} - ${bed.number}` }));

        if (bed.status === 'occupied' && bed.patientId) {
            setIsFetching(true);
            setLivePatient(null);
            getDoc(doc(db, 'facilities', user.facilityId, 'patients', bed.patientId))
                .then(snap => {
                    if (snap.exists()) {
                        setLivePatient({ id: snap.id, ...snap.data() } as FirestorePatient);
                    }
                })
                .catch(err => console.error('[BedDetailsModal] fetch patient:', err))
                .finally(() => setIsFetching(false));
        } else {
            setLivePatient(null);
        }
    }, [isOpen, bed, user?.facilityId]);

    if (!isOpen || !bed) return null;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onAssign(bed.id, {
            name: formData.name,
            age: parseInt(formData.age) || 0,
            gender: formData.gender,
            symptoms: formData.symptoms.split(',').map(s => s.trim()),
            ward: formData.ward,
        });
        setFormData({ name: '', age: '', gender: 'M', symptoms: '', ward: '' });
        onClose();
    };

    const handleDischarge = async () => {
        if (!livePatient?.id || !user?.facilityId) { onDischarge(bed.id); return; }
        setIsDischarging(true);
        try {
            await updateDoc(
                doc(db, 'facilities', user.facilityId, 'patients', livePatient.id),
                { status: 'discharged' }
            );
            // Refresh the 6-hour aggregate so CSV export reflects this discharge
            update6HourReport(user.facilityId).catch(console.error);
            onDischarge(bed.id);
            onClose();
        } catch (err) {
            console.error('[BedDetailsModal] discharge error:', err);
        } finally {
            setIsDischarging(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    const headerBg =
        bed.status === 'available' ? 'bg-green-50  border-green-100' :
            bed.status === 'occupied' ? 'bg-red-50    border-red-100' :
                bed.status === 'cleaning' ? 'bg-yellow-50 border-yellow-100' :
                    'bg-gray-50   border-gray-100';

    const badgeCls =
        bed.status === 'available' ? 'bg-green-100  text-green-700' :
            bed.status === 'occupied' ? 'bg-red-100    text-red-700' :
                bed.status === 'cleaning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100   text-gray-700';

    const dotCls =
        bed.status === 'available' ? 'bg-green-500' :
            bed.status === 'occupied' ? 'bg-red-500' :
                bed.status === 'cleaning' ? 'bg-yellow-500' :
                    'bg-gray-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className={clsx('p-6 flex justify-between items-center border-b', headerBg)}>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <BedDouble className="w-5 h-5 text-gray-600" />
                            {bed.ward} — <span className="text-2xl">{bed.number}</span>
                        </h3>
                        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1', badgeCls)}>
                            <div className={clsx('w-1.5 h-1.5 rounded-full', dotCls)} />
                            {bed.status.toUpperCase()}
                            {bed.type === 'icu' && (
                                <span className="ml-1 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">ICU</span>
                            )}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">

                    {/* ── OCCUPIED: show patient info ── */}
                    {bed.status === 'occupied' && (
                        isFetching ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                                <p className="text-sm">Loading patient data…</p>
                            </div>
                        ) : livePatient ? (
                            <div className="space-y-5">
                                {/* Patient identity */}
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                        <User className="w-7 h-7 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">{livePatient.name ?? '—'}</h4>
                                        <p className="text-sm text-gray-500">
                                            {livePatient.age ? `${livePatient.age} yrs` : '—'}
                                            {livePatient.gender ? ` • ${livePatient.gender}` : ''}
                                            {livePatient.id ? ` • ID: ${livePatient.id}` : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                            <Calendar className="w-3.5 h-3.5" /> Admission Date
                                        </div>
                                        <p className="font-semibold text-gray-800 text-sm">
                                            {livePatient.admissionDate ?? '—'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                            <Activity className="w-3.5 h-3.5" /> Status
                                        </div>
                                        <p className={clsx(
                                            'font-semibold text-sm capitalize',
                                            livePatient.status === 'critical' ? 'text-red-600' : 'text-gray-800'
                                        )}>
                                            {livePatient.status ?? '—'}
                                        </p>
                                    </div>
                                    {livePatient.diagnosis && (
                                        <div className="p-3 bg-blue-50 rounded-xl col-span-2">
                                            <div className="text-xs text-gray-400 mb-1">Diagnosis</div>
                                            <p className="font-semibold text-blue-800 text-sm">{livePatient.diagnosis}</p>
                                        </div>
                                    )}
                                    {(livePatient.symptoms ?? []).length > 0 && (
                                        <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                                                <Thermometer className="w-3.5 h-3.5" /> Symptoms
                                            </div>
                                            <p className="font-medium text-gray-800 text-sm">
                                                {livePatient.symptoms?.join(', ')}
                                            </p>
                                        </div>
                                    )}
                                    {(livePatient.icuRequired || livePatient.oxygenRequired) && (
                                        <div className="col-span-2 flex gap-2 flex-wrap">
                                            {livePatient.icuRequired && (
                                                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                    ICU Required
                                                </span>
                                            )}
                                            {livePatient.oxygenRequired && (
                                                <span className="px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-semibold">
                                                    Oxygen Required
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Alert */}
                                <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100 flex gap-2 items-start">
                                    <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-yellow-700">
                                        Discharge only if vitals are stable and confirmed by the attending physician.
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDischarge}
                                        disabled={isDischarging}
                                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDischarging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Discharge Patient
                                    </button>
                                    {onViewRecord && livePatient.id && (
                                        <button
                                            onClick={() => onViewRecord(livePatient.id)}
                                            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition-all"
                                        >
                                            View Full Record
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Occupied but patientId missing from bed object */
                            <div className="text-center py-8 text-gray-400">
                                <User className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Patient record unavailable.</p>
                                <p className="text-xs mt-1 text-gray-300">
                                    The patient may have been added without a linked record.
                                </p>
                            </div>
                        )
                    )}

                    {/* ── AVAILABLE: admit form ── */}
                    {bed.status === 'available' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h4 className="font-bold text-gray-800 text-base mb-2">Admit New Patient</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                                    <input
                                        required
                                        type="number"
                                        min={0}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                                        placeholder="Age"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                                    placeholder="Fever, Cough, Headache (comma separated)"
                                    rows={2}
                                    value={formData.symptoms}
                                    onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Admit Patient
                            </button>
                        </form>
                    )}

                    {/* ── CLEANING / MAINTENANCE ── */}
                    {(bed.status === 'cleaning' || bed.status === 'maintenance') && (
                        <div className="text-center py-8">
                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">
                                This bed is currently <strong>{bed.status}</strong>.
                            </p>
                            <button
                                onClick={() => onClean(bed.id)}
                                className="mt-4 text-primary hover:underline text-sm"
                            >
                                Mark as Available
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { X, User, Activity, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Bed, Patient } from '../../types';
import { clsx } from 'clsx';

export interface BedDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed | null;
    patient: Patient | null;
    onAssign: (bedId: string, patientData: Omit<Patient, 'id' | 'admissionDate' | 'status'>) => void;
    onDischarge: (bedId: string) => void;
    onClean: (bedId: string) => void;
    onViewRecord?: (patientId: string) => void;
}

export const BedDetailsModal = ({
    isOpen,
    onClose,
    bed,
    patient,
    onAssign,
    onDischarge,
    onClean,
    onViewRecord
}: BedDetailsModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'M',
        symptoms: '',
        ward: '' // Will be auto-filled or editable
    });

    useEffect(() => {
        if (bed && isOpen) {
            setFormData(prev => ({ ...prev, ward: `${bed.ward} - ${bed.number}` }));
        }
    }, [bed, isOpen]);

    if (!isOpen || !bed) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onAssign(bed.id, {
            name: formData.name,
            age: parseInt(formData.age) || 0,
            gender: formData.gender,
            symptoms: formData.symptoms.split(',').map(s => s.trim()),
            ward: formData.ward
        });
        // Reset form
        setFormData({ name: '', age: '', gender: 'M', symptoms: '', ward: '' });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className={clsx(
                    "p-6 flex justify-between items-center border-b",
                    bed.status === 'available' ? "bg-green-50 border-green-100" :
                        bed.status === 'occupied' ? "bg-red-50 border-red-100" :
                            "bg-gray-50 border-gray-100"
                )}>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {bed.ward} - <span className="text-2xl">{bed.number}</span>
                        </h3>
                        <span className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1",
                            bed.status === 'available' ? "bg-green-100 text-green-700" :
                                bed.status === 'occupied' ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-700"
                        )}>
                            <div className={clsx("w-1.5 h-1.5 rounded-full",
                                bed.status === 'available' ? "bg-green-500" :
                                    bed.status === 'occupied' ? "bg-red-500" : "bg-gray-500"
                            )} />
                            {bed.status.toUpperCase()}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {bed.status === 'occupied' && patient ? (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-4 bg-blue-50 rounded-full">
                                    <User className="w-8 h-8 text-blue-500" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900">{patient.name}</h4>
                                    <p className="text-gray-500">{patient.age} years • {patient.gender}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                        <Calendar className="w-4 h-4" /> Admission Date
                                    </div>
                                    <p className="font-medium text-gray-900">{patient.admissionDate}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                        <Activity className="w-4 h-4" /> Symptoms
                                    </div>
                                    <p className="font-medium text-gray-900 truncate">
                                        {patient.symptoms.join(', ')}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                                <p className="text-sm text-yellow-700">
                                    Patient is currently under observation. Discharge only if vitals are stable.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => onDischarge(bed.id)}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm active:scale-95 transform"
                                >
                                    Discharge Patient
                                </button>
                                <button
                                    onClick={() => onViewRecord && onViewRecord(patient.id)}
                                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg font-medium transition-colors"
                                >
                                    View Full Record
                                </button>
                            </div>
                        </div>
                    ) : bed.status === 'available' ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h4 className="font-semibold text-gray-900 mb-4">Admit New Patient</h4>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                            placeholder="Age"
                                            value={formData.age}
                                            onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                        placeholder="Fever, Cough, Headache (comma separated)"
                                        rows={2}
                                        value={formData.symptoms}
                                        onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg font-medium transition-all shadow-sm active:scale-95 transform mt-2 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Admit Patient
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-8">
                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">
                                This bed is currently under <strong>{bed.status}</strong>.
                            </p>
                            <button
                                onClick={() => onClean(bed.id)}
                                className="mt-4 text-primary hover:underline"
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

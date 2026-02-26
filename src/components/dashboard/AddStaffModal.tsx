import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Staff } from '../../types';

export interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    facilityId: string;
    onSuccess?: () => void;
}

export const AddStaffModal = ({ isOpen, onClose, facilityId, onSuccess }: AddStaffModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        role: 'Doctor',
        department: '',
        shift: 'Morning',
        status: 'Active'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!facilityId) return;

        setIsSaving(true);
        setError(null);

        try {
            await addDoc(collection(db, 'facilities', facilityId, 'staff'), {
                ...formData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Reset form
            setFormData({ name: '', role: 'Doctor', department: '', shift: 'Morning', status: 'Active' });
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('[AddStaffModal] error:', err);
            setError('Failed to add staff member. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 flex justify-between items-center border-b bg-gray-50 border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Add New Staff</h3>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                placeholder="Dr. John Doe"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="Doctor">Doctor</option>
                                    <option value="Nurse">Nurse</option>
                                    <option value="Technician">Technician</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    placeholder="e.g. Cardiology"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    value={formData.shift}
                                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                                >
                                    <option value="Morning">Morning</option>
                                    <option value="Evening">Evening</option>
                                    <option value="Night">Night</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="On Leave">On Leave</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white py-2.5 rounded-lg font-medium transition-all shadow-sm active:scale-95 transform mt-4 flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            {isSaving ? 'Adding Staff Member...' : 'Add Staff Member'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

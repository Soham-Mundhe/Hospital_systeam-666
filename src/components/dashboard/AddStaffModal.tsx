import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, CheckCircle2, Loader2, Save } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

import type { Staff as StaffType } from '../../types';

export interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    facilityId: string;
    onSuccess?: () => void;
    editingStaff?: StaffType | null;
}

export const AddStaffModal = ({ isOpen, onClose, facilityId, onSuccess, editingStaff }: AddStaffModalProps) => {
    const [formData, setFormData] = useState({
        name: editingStaff?.name || '',
        role: editingStaff?.role || 'Doctor',
        department: editingStaff?.department || '',
        shift: editingStaff?.shift || 'Morning',
        status: editingStaff?.status || 'Active'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync form data when editingStaff changes
    useState(() => {
        if (editingStaff) {
            setFormData({
                name: editingStaff.name,
                role: editingStaff.role,
                department: editingStaff.department,
                shift: staffShift(editingStaff.shift),
                status: editingStaff.status
            });
        }
    });

    function staffShift(s: string) {
        if (!s) return 'Morning';
        if (s.toLowerCase().includes('morning')) return 'Morning';
        if (s.toLowerCase().includes('evening')) return 'Evening';
        if (s.toLowerCase().includes('night')) return 'Night';
        return 'Morning';
    }

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!facilityId) return;

        setIsSaving(true);
        setError(null);

        try {
            if (editingStaff) {
                const staffRef = doc(db, 'facilities', facilityId, 'staff', editingStaff.id);
                await updateDoc(staffRef, {
                    ...formData,
                    updatedAt: serverTimestamp(),
                });
            } else {
                await addDoc(collection(db, 'facilities', facilityId, 'staff'), {
                    ...formData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }

            if (!editingStaff) {
                setFormData({ name: '', role: 'Doctor', department: '', shift: 'Morning', status: 'Active' });
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('[AddStaffModal] error:', err);
            setError(`Failed to ${editingStaff ? 'update' : 'add'} staff member. Please try again.`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 flex justify-between items-center border-b bg-slate-50 border-slate-100">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingStaff ? 'Update Profile' : 'Add New Staff'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingStaff ? 'Edit Staff Credentials' : 'Register Hospital Personnel'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
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
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
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
                                    onChange={e => setFormData({ ...formData, shift: e.target.value as any })}
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
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="On Leave">On Leave</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-100 active:scale-95 transform mt-4 flex items-center justify-center gap-3"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : editingStaff ? (
                                <Save className="w-5 h-5" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            {isSaving ? (editingStaff ? 'Updating...' : 'Adding...') : editingStaff ? 'Update Roster' : 'Register Staff Member'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

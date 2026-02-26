import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableCell, TableRow } from '../components/Table';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { clsx } from 'clsx';
import { AddStaffModal } from '../components/dashboard/AddStaffModal';
import { Wifi, Users, Shield, CheckCircle } from 'lucide-react';
import type { Staff as StaffType } from '../types';

export const Staff: FC = () => {
    const { user } = useAuth();
    const [staff, setStaff] = useState<StaffType[]>([]);
    const [filterRole, setFilterRole] = useState<string>('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        if (!user?.facilityId) return;

        const q = query(
            collection(db, 'facilities', user.facilityId, 'staff'),
            orderBy('name', 'asc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const staffData = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as StaffType));
            setStaff(staffData);
            setLastSync(new Date());
            setIsLoading(false);
        }, (err) => {
            console.error('[Staff] error:', err);
            setIsLoading(false);
        });

        return () => unsub();
    }, [user?.facilityId]);

    if (!user) return null;

    const roles = ['All', ...new Set(staff.map(s => s.role))];

    const filteredStaff = filterRole === 'All'
        ? staff
        : staff.filter(s => s.role === filterRole);

    const handleSuccess = () => {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Staff Management
                    </h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-gray-500 text-sm">View roster and shift timings.</p>
                        {lastSync && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <Wifi className="w-3 h-3" />
                                Live · {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-500 uppercase font-bold tracking-wider">
                        <Shield className="w-3 h-3" /> Admin Access
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 sm:flex-none bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 transition-all shadow-sm active:scale-95 transform"
                    >
                        Add Staff
                    </button>
                </div>
            </div>

            {/* Role Filter */}
            {staff.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {roles.map(role => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={clsx(
                                "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                                filterRole === role
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                            )}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Table headers={['ID', 'Name', 'Role', 'Department', 'Shift', 'Status']}>
                    {isLoading ? (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-gray-400">
                                <span className="inline-flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading roster...
                                </span>
                            </td>
                        </tr>
                    ) : filteredStaff.length > 0 ? (
                        filteredStaff.map((staffMember) => (
                            <TableRow key={staffMember.id}>
                                <TableCell className="font-mono text-xs text-gray-500">{staffMember.id.slice(-6).toUpperCase()}</TableCell>
                                <TableCell className="font-medium text-gray-900">{staffMember.name}</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {staffMember.role}
                                    </span>
                                </TableCell>
                                <TableCell>{staffMember.department}</TableCell>
                                <TableCell>{staffMember.shift}</TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        <span className={clsx(
                                            "h-2 w-2 rounded-full mr-2",
                                            staffMember.status === 'Active' ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                                        )}></span>
                                        <span className="text-sm text-gray-700">{staffMember.status}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-gray-400">
                                No staff members found.
                            </td>
                        </tr>
                    )}
                </Table>
            </div>

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg border border-green-500/20 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
                    <CheckCircle className="w-5 h-5 text-green-100" />
                    <span className="text-sm font-semibold">Staff member added successfully!</span>
                </div>
            )}

            <AddStaffModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                facilityId={user.facilityId}
                onSuccess={handleSuccess}
            />
        </div>
    );
};

// Re-using same style as Records for the refresh icon helper
const RefreshCw: FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

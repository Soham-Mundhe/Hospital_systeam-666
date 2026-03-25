import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableCell, TableRow } from '../components/Table';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { clsx } from 'clsx';
import { AddStaffModal } from '../components/dashboard/AddStaffModal';
import { 
    Wifi, Users, Shield, CheckCircle, 
    RefreshCw, Sun, Moon, 
    MoreVertical, Plus, Trash2, Edit2, UserMinus, UserCheck
} from 'lucide-react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import type { Staff as StaffType } from '../types';

export const Staff: FC = () => {
    const { user } = useAuth();
    const [staff, setStaff] = useState<StaffType[]>([]);
    const [filterRole, setFilterRole] = useState<string>('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffType | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
        setEditingStaff(null);
    };

    const handleDelete = async (staffId: string) => {
        if (!user.facilityId || !window.confirm('Are you sure you want to remove this staff member?')) return;
        try {
            await deleteDoc(doc(db, 'facilities', user.facilityId, 'staff', staffId));
        } catch (err) {
            console.error('Error deleting staff:', err);
        }
    };

    const handleToggleStatus = async (s: StaffType) => {
        if (!user.facilityId) return;
        try {
            const newStatus = s.status === 'Active' ? 'On Leave' : 'Active';
            await updateDoc(doc(db, 'facilities', user.facilityId, 'staff', s.id), {
                status: newStatus
            });
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getRoleConfig = (role: string) => {
        const roleLower = role.toLowerCase();
        if (roleLower.includes('doctor')) return { color: 'emerald', icon: Shield };
        if (roleLower.includes('nurse')) return { color: 'blue', icon: Shield };
        return { color: 'slate', icon: Shield };
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
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] shadow-sm">
                        <Shield className="w-3.5 h-3.5 text-slate-400" /> Admin Access
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 transform shadow-blue-100"
                    >
                        <Plus className="w-4 h-4 inline-block mr-2" />
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
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border-2",
                                filterRole === role
                                    ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100"
                                    : "bg-white text-slate-400 hover:bg-slate-50 border-slate-100"
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
                        filteredStaff.map((staffMember) => {
                            const config = getRoleConfig(staffMember.role);
                            const initials = getInitials(staffMember.name);
                            const isMorning = staffMember.shift?.toLowerCase().includes('morning');
                            const isActive = staffMember.status === 'Active';

                            return (
                                <TableRow key={staffMember.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-mono text-[10px] font-bold text-slate-400 tracking-wider">
                                        #{staffMember.id.slice(-6).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ring-4 ring-white shadow-sm transition-transform group-hover:scale-110",
                                                config.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                                                config.color === 'blue' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {initials}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm leading-tight">{staffMember.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{staffMember.department || 'General'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={clsx(
                                            "inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                            config.color === 'emerald' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                            config.color === 'blue' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-600 border-slate-100"
                                        )}>
                                            {staffMember.role}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {isMorning ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                                            <span className="text-xs font-bold text-slate-600">{staffMember.shift}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={clsx(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                                            isActive ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-700"
                                        )}>
                                            <div className={clsx(
                                                "w-1.5 h-1.5 rounded-full shadow-sm",
                                                isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                                            )} />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">{staffMember.status}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="relative">
                                        <button 
                                            onClick={() => setOpenMenuId(openMenuId === staffMember.id ? null : staffMember.id)}
                                            className="p-2 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {openMenuId === staffMember.id && (
                                            <>
                                                <div 
                                                    className="fixed inset-0 z-20" 
                                                    onClick={() => setOpenMenuId(null)}
                                                />
                                                <div className="absolute right-6 top-0 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingStaff(staffMember);
                                                            setIsModalOpen(true);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            handleToggleStatus(staffMember);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        {isActive ? <UserMinus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                        {isActive ? 'Mark On Leave' : 'Set Active'}
                                                    </button>
                                                    <div className="h-px bg-slate-100 my-1 mx-2" />
                                                    <button 
                                                        onClick={() => {
                                                            handleDelete(staffMember.id);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Remove Staff
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
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
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingStaff(null);
                }}
                facilityId={user.facilityId}
                onSuccess={handleSuccess}
                editingStaff={editingStaff}
            />
        </div>
    );
};


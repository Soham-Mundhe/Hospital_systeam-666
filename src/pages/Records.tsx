import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableCell, TableRow } from '../components/Table';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { clsx } from 'clsx';
import { useSearchParams } from 'react-router-dom';
import { Search, Eye, Shield, RefreshCw, UserPlus, CheckCircle, Wifi, FlaskConical, Calendar } from 'lucide-react';
import { AddPatientModal } from '../components/AddPatientModal';
import { PatientDetailModal } from '../components/PatientDetailModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'Doctor' | 'Nurse' | 'Admin' | 'Lab Tech';

interface FirestoreRecord {
    id: string;
    [key: string]: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Records: FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedPatientDocId, setSelectedPatientDocId] = useState<string | null>(null);

    // Live Firestore data
    const [records, setRecords] = useState<FirestoreRecord[]>([]);
    const [lastSync, setLastSync] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);

    // Simulated Role State for UI Demo
    const [simulatedRole, setSimulatedRole] = useState<Role>(
        user?.facilityType === 'lab' ? 'Lab Tech' : 'Doctor'
    );

    // Live Firestore listener — branches based on facilityType
    useEffect(() => {
        if (!user?.facilityId || !user?.facilityType) return;

        setIsLoading(true);
        const fid = user.facilityId;
        const type = user.facilityType;

        let collectionPath = '';
        let sortField = 'createdAt';

        if (type === 'hospital') {
            collectionPath = 'patients';
        } else if (type === 'clinic') {
            collectionPath = 'appointments';
            sortField = 'time'; // or appointmentDate
        } else if (type === 'lab') {
            collectionPath = 'samples';
            sortField = 'date';
        }

        const q = query(
            collection(db, 'facilities', fid, collectionPath),
            orderBy(sortField, 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLastSync(new Date());
            setIsLoading(false);
        }, (err) => {
            console.error(`[Records] ${type} error:`, err);
            setIsLoading(false);
        });

        return () => unsub();
    }, [user?.facilityId, user?.facilityType]);

    useEffect(() => {
        const queryVal = searchParams.get('search');
        if (queryVal) setSearchTerm(queryVal);
    }, [searchParams]);

    useEffect(() => {
        const pid = searchParams.get('patient');
        if (pid) setSelectedPatientDocId(pid);
    }, [searchParams]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (term) setSearchParams({ search: term });
        else setSearchParams({});
    };

    if (!user) return null;

    // Filter Logic
    const term = searchTerm.toLowerCase();
    const filteredRecords = records.filter(p => {
        const searchableString = JSON.stringify(p).toLowerCase();
        return searchableString.includes(term);
    });

    const getAccessLevel = (role: Role) => {
        if (role === 'Doctor' || role === 'Admin') return 'Write Access';
        return 'Read Only';
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {user.facilityType === 'hospital' ? 'Patient Records' :
                            user.facilityType === 'clinic' ? 'Appointments' : 'Test Samples'}
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200 uppercase tracking-tighter">
                            Role: {simulatedRole}
                        </span>
                    </h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-gray-500 flex items-center gap-2 text-sm">
                            <Shield className="w-3 h-3" />
                            <span className={clsx("font-semibold", simulatedRole === 'Nurse' ? "text-orange-600" : "text-green-600")}>{getAccessLevel(simulatedRole)}</span>
                        </p>
                        <span className="text-gray-300">|</span>
                        {lastSync && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <Wifi className="w-3 h-3" />
                                Live · {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-end">
                    {/* Role Simulator Dropdown */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Simulation Mode</label>
                        <select
                            value={simulatedRole}
                            onChange={(e) => setSimulatedRole(e.target.value as Role)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2 outline-none shadow-sm"
                        >
                            <option value="Doctor">Doctor</option>
                            <option value="Nurse">Nurse (Limited)</option>
                            <option value="Admin">Admin</option>
                            <option value="Lab Tech">Lab Tech</option>
                        </select>
                    </div>

                    <div className="relative flex-1 sm:w-64 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search live records..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    {/* Add Patient Button — hospital + write-access roles only */}
                    {user?.facilityType === 'hospital' &&
                        (simulatedRole === 'Doctor' || simulatedRole === 'Admin') && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transform text-white text-sm font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Record
                            </button>
                        )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
                        <p className="text-sm font-medium">Syncing live {user.facilityType} records...</p>
                    </div>
                ) : (
                    <>
                        {user.facilityType === 'hospital' && (
                            <Table headers={['ID', 'Patient Info', 'Ward & Unit', 'Clinical Status', 'Access']}>
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((patient) => (
                                        <TableRow key={patient.id}>
                                            <TableCell className="font-mono text-[10px] text-gray-400 tracking-tighter">
                                                {patient.id.slice(-8).toUpperCase()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-gray-900">{patient.name ?? 'Unknown'}</div>
                                                <div className="text-[11px] text-gray-500 font-medium">
                                                    {patient.age ?? '—'}y / {patient.gender ?? '—'} · {patient.diagnosis ?? 'No diagnosis'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-semibold text-gray-700">{patient.ward ?? 'Unassigned'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={clsx(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    patient.status === 'admitted' && "bg-blue-100 text-blue-700",
                                                    patient.status === 'discharged' && "bg-green-100 text-green-700",
                                                    patient.status === 'critical' && "bg-red-100 text-red-700 animate-pulse",
                                                    patient.status === 'pending' && "bg-yellow-100 text-yellow-700"
                                                )}>
                                                    {patient.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="p-1 px-2 border border-gray-100 rounded bg-gray-50 text-gray-400 hover:text-primary hover:border-primary/20 transition-all flex items-center gap-1.5"
                                                        onClick={() => setSelectedPatientDocId(patient.id)}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">VIEW</span>
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <EmptyState term={searchTerm} />
                                )}
                            </Table>
                        )}

                        {user.facilityType === 'clinic' && (
                            <Table headers={['ID', 'Patient Name', 'Provider', 'Time Slot', 'Type', 'Status']}>
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((apt) => (
                                        <TableRow key={apt.id}>
                                            <TableCell className="font-mono text-xs">{apt.id.slice(-4).toUpperCase()}</TableCell>
                                            <TableCell className="font-semibold text-gray-900">{apt.patientName ?? '—'}</TableCell>
                                            <TableCell className="text-gray-600">{apt.doctorName ?? '—'}</TableCell>
                                            <TableCell className="font-mono text-xs font-bold text-blue-600">{apt.time ?? '—'}</TableCell>
                                            <TableCell className="capitalize text-xs font-medium text-gray-500">{apt.type ?? 'General'}</TableCell>
                                            <TableCell>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-tighter",
                                                    apt.status === 'confirmed' && "bg-green-100 text-green-700",
                                                    apt.status === 'pending' && "bg-yellow-100 text-yellow-700",
                                                    apt.status === 'completed' && "bg-blue-100 text-blue-700"
                                                )}>
                                                    {apt.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <EmptyState term={searchTerm} icon={<Calendar className="w-8 h-8" />} />
                                )}
                            </Table>
                        )}

                        {user.facilityType === 'lab' && (
                            <Table headers={['Sample ID', 'Patient', 'Investigation', 'Logged', 'Phase', 'Status']}>
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((test) => (
                                        <TableRow key={test.id}>
                                            <TableCell className="font-mono text-xs font-bold text-primary">{test.sampleId ?? test.id.slice(-6).toUpperCase()}</TableCell>
                                            <TableCell className="font-medium text-gray-900">{test.patientName ?? '—'}</TableCell>
                                            <TableCell className="text-gray-600 font-medium">{test.testName ?? '—'}</TableCell>
                                            <TableCell className="text-xs text-gray-400">{test.date ?? '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Current Phase</span>
                                                    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={clsx(
                                                            "h-full transition-all duration-1000",
                                                            test.status === 'completed' ? "w-full bg-green-500" :
                                                                test.status === 'processing' ? "w-2/3 bg-blue-500" : "w-1/3 bg-yellow-500"
                                                        )} />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                                    test.status === 'completed' && "bg-green-100 text-green-700",
                                                    test.status === 'processing' && "bg-blue-100 text-blue-700",
                                                    test.status === 'collected' && "bg-yellow-100 text-yellow-700"
                                                )}>
                                                    {test.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <EmptyState term={searchTerm} icon={<FlaskConical className="w-8 h-8" />} />
                                )}
                            </Table>
                        )}
                    </>
                )}
            </div>

            {/* Save Success Toast */}
            {saveSuccess && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg border border-green-500/20 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
                    <CheckCircle className="w-5 h-5 text-green-100" />
                    <span className="text-sm font-semibold">Live Firestore document synced!</span>
                </div>
            )}

            {/* Add Patient Modal */}
            {showAddModal && user && (
                <AddPatientModal
                    facilityId={user.facilityId}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 3500);
                    }}
                />
            )}

            {/* Patient Detail Modal */}
            {selectedPatientDocId && user && (
                <PatientDetailModal
                    facilityId={user.facilityId}
                    patientDocId={selectedPatientDocId}
                    onClose={() => {
                        setSelectedPatientDocId(null);
                        if (searchParams.has('patient')) {
                            setSearchParams(prev => {
                                const next = new URLSearchParams(prev);
                                next.delete('patient');
                                return next;
                            });
                        }
                    }}
                />
            )}
        </div>
    );
};

const EmptyState = ({ term, icon }: { term: string, icon?: React.ReactNode }) => (
    <tr>
        <td colSpan={8} className="text-center py-20 text-gray-400">
            <div className="flex flex-col items-center gap-2">
                {icon || <Search className="w-8 h-8 opacity-20" />}
                <p className="text-sm font-semibold text-gray-500">No records found matching "{term}"</p>
                <p className="text-[11px] uppercase tracking-wider font-bold opacity-40">Verification Check: Firestore Collection is Live</p>
            </div>
        </td>
    </tr>
)

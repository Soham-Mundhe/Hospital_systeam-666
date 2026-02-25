import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableCell, TableRow } from '../components/Table';
import { clinicAppointments, labTests } from '../mockData';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { clsx } from 'clsx';
import { useSearchParams } from 'react-router-dom';
import { Search, Eye, Edit2, Shield, RefreshCw, UserPlus, CheckCircle } from 'lucide-react';
import { AddPatientModal } from '../components/AddPatientModal';
import { PatientDetailModal } from '../components/PatientDetailModal';

type Role = 'Doctor' | 'Nurse' | 'Admin' | 'Lab Tech';

interface FirestorePatient {
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
}

export const Records: FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedPatientDocId, setSelectedPatientDocId] = useState<string | null>(null);

    // Live Firestore patients (hospital only)
    const [firestorePatients, setFirestorePatients] = useState<FirestorePatient[]>([]);
    const [lastSync, setLastSync] = useState<Date>(new Date());

    // Simulated Role State for UI Demo
    const [simulatedRole, setSimulatedRole] = useState<Role>(
        user?.facilityType === 'lab' ? 'Lab Tech' : 'Doctor'
    );

    // Live Firestore listener for hospital patients
    useEffect(() => {
        if (user?.facilityType !== 'hospital' || !user?.facilityId) return;
        const q = query(
            collection(db, 'facilities', user.facilityId, 'patients'),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setFirestorePatients(
                snap.docs.map(d => ({ id: d.id, ...d.data() }) as FirestorePatient)
            );
            setLastSync(new Date());
        }, (err) => console.error('[Records] patients:', err));
        return () => unsub();
    }, [user?.facilityId, user?.facilityType]);

    useEffect(() => {
        const query = searchParams.get('search');
        if (query) setSearchTerm(query);
    }, [searchParams]);

    // Auto-open patient detail when navigated from bed grid with ?patient=docId
    useEffect(() => {
        const pid = searchParams.get('patient');
        if (pid) setSelectedPatientDocId(pid);
    }, [searchParams]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (term) {
            setSearchParams({ search: term });
        } else {
            setSearchParams({});
        }
    };

    if (!user) return null;

    // Filter Logic
    const term = searchTerm.toLowerCase();
    const filteredHospitalPatients = firestorePatients.filter(p =>
        (p.name ?? '').toLowerCase().includes(term) ||
        (p.patientId ?? p.id ?? '').toLowerCase().includes(term) ||
        (p.diagnosis ?? '').toLowerCase().includes(term)
    );

    const filteredClinicAppointments = clinicAppointments.filter(a =>
        a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLabTests = labTests.filter(t =>
        t.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.testName.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                            Simulating: {simulatedRole}
                        </span>
                    </h1>
                    <p className="text-gray-500 flex items-center gap-2 text-sm mt-1">
                        <Shield className="w-3 h-3" />
                        Access Level: <span className={clsx("font-semibold", simulatedRole === 'Nurse' ? "text-orange-600" : "text-green-600")}>{getAccessLevel(simulatedRole)}</span>
                        <span className="text-gray-300">|</span>
                        <RefreshCw className="w-3 h-3" />
                        Data last updated: <span className="font-mono text-gray-700">{user.facilityType === 'hospital' ? lastSync.toLocaleTimeString() : 'Just now'}</span>
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-end">
                    {/* Role Simulator Dropdown */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">View As (Sim)</label>
                        <select
                            value={simulatedRole}
                            onChange={(e) => setSimulatedRole(e.target.value as Role)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2"
                        >
                            <option value="Doctor">Doctor</option>
                            <option value="Nurse">Nurse</option>
                            <option value="Admin">Admin</option>
                            <option value="Lab Tech">Lab Tech</option>
                        </select>
                    </div>

                    <div className="relative flex-1 sm:w-64 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    {/* Add Patient Button — hospital + write-access roles only */}
                    {user?.facilityType === 'hospital' &&
                        (simulatedRole === 'Doctor' || simulatedRole === 'Admin') && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Patient
                            </button>
                        )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {user.facilityType === 'hospital' && (
                    <Table headers={[
                        'ID',
                        'Name',
                        'Age/Gender',
                        'Ward',
                        'Status',
                        ...(simulatedRole === 'Doctor' ? ['Clinical Notes'] : []),
                        ...(simulatedRole === 'Nurse' ? ['Vitals'] : []),
                        'Access'
                    ]}>
                        {filteredHospitalPatients.length > 0 ? (
                            filteredHospitalPatients.map((patient) => (
                                <TableRow key={patient.id}>
                                    <TableCell className="font-medium text-gray-900">
                                        {patient.patientId ?? patient.id}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{patient.name ?? '—'}</div>
                                        <div className="text-xs text-gray-500">
                                            {patient.diagnosis ?? (patient.symptoms ?? []).join(', ')}
                                        </div>
                                    </TableCell>
                                    <TableCell>{patient.age} / {patient.gender}</TableCell>
                                    <TableCell>{patient.ward ?? '—'}</TableCell>
                                    <TableCell>
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium",
                                            patient.status === 'admitted' && "bg-blue-100 text-blue-700",
                                            patient.status === 'discharged' && "bg-green-100 text-green-700",
                                            patient.status === 'critical' && "bg-red-100 text-red-700",
                                            patient.status === 'pending' && "bg-yellow-100 text-yellow-700"
                                        )}>
                                            {patient.status}
                                        </span>
                                    </TableCell>

                                    {simulatedRole === 'Doctor' && (
                                        <TableCell>
                                            <span className="text-xs text-gray-500 italic">Restricted: Dr. only</span>
                                        </TableCell>
                                    )}
                                    {simulatedRole === 'Nurse' && (
                                        <TableCell>
                                            <span className="text-xs font-mono text-gray-600">BP: 120/80</span>
                                        </TableCell>
                                    )}

                                    <TableCell>
                                        <div className="flex gap-2">
                                            <button
                                                className="text-gray-400 hover:text-primary transition-colors"
                                                title="View Full Record"
                                                onClick={() => setSelectedPatientDocId(patient.id)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {(simulatedRole === 'Doctor' || simulatedRole === 'Admin') && (
                                                <button className="text-gray-400 hover:text-green-600 transition-colors" title="Edit Record">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-gray-500">
                                    No records found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </Table>
                )}

                {user.facilityType === 'clinic' && (
                    <Table headers={['ID', 'Patient', 'Doctor', 'Time', 'Type', 'Status', 'Actions']}>
                        {filteredClinicAppointments.map((apt) => (
                            <TableRow key={apt.id}>
                                <TableCell className="font-medium text-gray-900">{apt.id}</TableCell>
                                <TableCell>{apt.patientName}</TableCell>
                                <TableCell>{apt.doctorName}</TableCell>
                                <TableCell>{apt.time}</TableCell>
                                <TableCell className="capitalize">{apt.type}</TableCell>
                                <TableCell>
                                    <span className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        apt.status === 'confirmed' && "bg-green-100 text-green-700",
                                        apt.status === 'pending' && "bg-yellow-100 text-yellow-700",
                                        apt.status === 'completed' && "bg-blue-100 text-blue-700"
                                    )}>
                                        {apt.status}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <button className="text-primary hover:underline text-xs">View</button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </Table>
                )}

                {user.facilityType === 'lab' && (
                    <Table headers={['Test ID', 'Patient', 'Test Name', 'Sample ID', 'Date', 'Status']}>
                        {filteredLabTests.map((test) => (
                            <TableRow key={test.id}>
                                <TableCell className="font-medium text-gray-900">{test.id}</TableCell>
                                <TableCell>{test.patientName}</TableCell>
                                <TableCell>{test.testName}</TableCell>
                                <TableCell>{test.sampleId}</TableCell>
                                <TableCell>{test.date}</TableCell>
                                <TableCell>
                                    <span className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        test.status === 'completed' && "bg-green-100 text-green-700",
                                        test.status === 'processing' && "bg-blue-100 text-blue-700",
                                        test.status === 'collected' && "bg-yellow-100 text-yellow-700"
                                    )}>
                                        {test.status}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </Table>
                )}
            </div>

            {/* Future-Ready Data Collection Comments (Invisible) */}
            {/* 
                <IE_DATA_COLLECTION>
                    timestamp: {new Date().toISOString()}
                    user_role: {simulatedRole}
                    interaction: "view_records"
                    wait_time_metric: "N/A"
                </IE_DATA_COLLECTION>
            */}

            {/* Save Success Toast */}
            {saveSuccess && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fade-in">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Patient record saved to Firestore!</span>
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
                        // Clean the URL param without reload
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

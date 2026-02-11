import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableCell, TableRow } from '../components/Table';
import { hospitalPatients, clinicAppointments, labTests } from '../mockData';
import { clsx } from 'clsx';
import { useSearchParams } from 'react-router-dom';
import { Search, Eye, Edit2, Shield, RefreshCw } from 'lucide-react';

type Role = 'Doctor' | 'Nurse' | 'Admin' | 'Lab Tech';

export const Records: FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

    // Simulated Role State for UI Demo
    const [simulatedRole, setSimulatedRole] = useState<Role>(
        user?.facilityType === 'lab' ? 'Lab Tech' : 'Doctor'
    );

    useEffect(() => {
        const query = searchParams.get('search');
        if (query) {
            setSearchTerm(query);
        }
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
    const filteredHospitalPatients = hospitalPatients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
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
                        Data last updated: <span className="font-mono text-gray-700">Just now</span>
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
                                    <TableCell className="font-medium text-gray-900">{patient.id}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{patient.name}</div>
                                        <div className="text-xs text-gray-500">{patient.symptoms.join(', ')}</div>
                                    </TableCell>
                                    <TableCell>{patient.age} / {patient.gender}</TableCell>
                                    <TableCell>{patient.ward}</TableCell>
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
                                            <button className="text-gray-400 hover:text-primary transition-colors" title="View Details">
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
        </div>
    );
};

import { useState } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { clinicStats, labStats, hospitalPatients, labPipeline } from '../mockData';
import { BedGrid } from '../components/dashboard/BedGrid';
import { EmergencyTicker } from '../components/dashboard/EmergencyTicker';
import { PatientQueue } from '../components/dashboard/PatientQueue';
import { AppointmentTimeline } from '../components/dashboard/AppointmentTimeline';
import { SamplePipeline } from '../components/dashboard/SamplePipeline';
import { HospitalIntelligence } from '../components/dashboard/HospitalIntelligence';
import { RecentCheckIns } from '../components/dashboard/RecentCheckIns';
import { useNavigate } from 'react-router-dom';
import type { Bed, Patient } from '../types';
import { BedDetailsModal } from '../components/dashboard/BedDetailsModal';
import { PatientDetailModal } from '../components/PatientDetailModal';
import { useHospitalLiveData } from '../hooks/useHospitalLiveData';
import { useLiveBeds } from '../hooks/useLiveBeds';
import { Activity } from 'lucide-react';
import { clsx } from 'clsx';

export const Dashboard: FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State for Bed Management (non-hospital facility mock beds kept for modal flow)
    const [beds, setBeds] = useState<Bed[]>([]);
    const [patients, setPatients] = useState<Patient[]>(hospitalPatients);
    const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRiskPatientId, setSelectedRiskPatientId] = useState<string | null>(null);

    // Filter patients to find the one assigned to the selected bed
    const selectedPatient = selectedBed?.patientId
        ? patients.find(p => p.id === selectedBed.patientId) || null
        : null;

    if (!user) {
        navigate('/login');
        return null;
    }

    // --- Handlers ---
    const handleBedClick = (bed: Bed) => {
        setSelectedBed(bed);
        setIsModalOpen(true);
    };

    const handleAssignPatient = (bedId: string, patientData: Omit<Patient, 'id' | 'admissionDate' | 'status'>) => {
        const newPatientId = `P-${Math.floor(Math.random() * 10000)}`;
        const newPatient: Patient = {
            id: newPatientId,
            ...patientData,
            status: 'admitted',
            admissionDate: new Date().toISOString().split('T')[0],
        };

        // Update Patients State
        setPatients(prev => [...prev, newPatient]);

        // Update Beds State
        setBeds(prev => prev.map(bed => {
            if (bed.id === bedId) {
                return {
                    ...bed,
                    status: 'occupied',
                    patientId: newPatientId,
                    patientName: newPatient.name
                };
            }
            return bed;
        }));
    };

    const handleDischargePatient = (bedId: string) => {
        // Find the bed to get the patient ID
        const bedToDischarge = beds.find(b => b.id === bedId);
        if (bedToDischarge?.patientId) {
            // Update Patient Status
            setPatients(prev => prev.map(p =>
                p.id === bedToDischarge.patientId
                    ? { ...p, status: 'discharged' }
                    : p
            ));
        }

        // Update Bed Status (Occupied -> Cleaning)
        setBeds(prev => prev.map(bed => {
            if (bed.id === bedId) {
                const { patientId, patientName, ...rest } = bed; // Remove patient info
                return {
                    ...rest,
                    status: 'cleaning',
                    patientId: undefined,
                    patientName: undefined
                };
            }
            return bed;
        }));
    };

    const handleCleanBed = (bedId: string) => {
        setBeds(prev => prev.map(bed => {
            if (bed.id === bedId) {
                return { ...bed, status: 'available' };
            }
            return bed;
        }));
    }

    const handleViewRecord = (patientId: string) => {
        navigate(`/records?patient=${patientId}`);
    };


    // Hospital Layout: High-density command center
    if (user.facilityType === 'hospital') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const live = useHospitalLiveData(user.facilityId);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { beds: liveBeds } = useLiveBeds(user.facilityId);
        const { bedOccupancy, icuOccupancy, oxygenLevel, emergencyActive } = live;

        // Build live StatCards from real Firestore data
        const liveHospitalStats = [
            {
                label: 'Admissions Today',
                value: live.admissionsToday,
                change: `${live.newAdmissions} new`,
                trend: 'up' as const,
                icon: 'Users',
            },
            {
                label: 'Bed Occupancy',
                value: live.bedOccupancyPct,
                change: live.totalBeds > 0 ? `${live.occupiedBeds}/${live.totalBeds}` : 'Set capacity →',
                trend: bedOccupancy > 85 ? 'down' as const : 'neutral' as const,
                icon: 'Bed',
            },
            {
                label: 'ICU Occupancy',
                value: live.icuOccupancyPct,
                change: live.icuBeds > 0 ? `${live.icuOccupied}/${live.icuBeds} beds` : 'Set capacity →',
                trend: icuOccupancy > 90 ? 'down' as const : 'neutral' as const,
                icon: 'Activity',
            },
            {
                label: 'Oxygen Units',
                value: live.oxygenDisplay,
                change: live.oxygenUnits > 0 ? 'Live' : 'Set in Settings',
                trend: 'neutral' as const,
                icon: 'Wind',
            },
        ];

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-end pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                            <Activity className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                Hospital Command Center
                                {emergencyActive && (
                                    <span className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full uppercase tracking-widest font-black border border-red-100 animate-pulse">
                                        Emergency Override
                                    </span>
                                )}
                            </h1>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Real-time Clinical Operations</p>
                        </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Update</p>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Active Stream</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Intelligence Centre (real-time Firestore) ── */}
                <HospitalIntelligence facilityId={user.facilityId} />

                {/* Resource Awareness Panel - Lighter Aesthetic */}
                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* General Beds */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>General Bed Occupancy</span>
                            <span className={clsx(
                                bedOccupancy > 90 ? "text-red-500" : "text-emerald-500"
                            )}>{bedOccupancy}%</span>
                        </div>
                        <div className="w-full bg-slate-50 rounded-full h-2 border border-slate-100">
                            <div
                                className={clsx("h-full rounded-full transition-all duration-1000",
                                    bedOccupancy > 90 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : bedOccupancy > 75 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${bedOccupancy}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* ICU Capacity */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>ICU Capacity Stress</span>
                            <span className={clsx(
                                icuOccupancy > 80 ? "text-red-500" : "text-blue-500"
                            )}>{icuOccupancy}%</span>
                        </div>
                        <div className="w-full bg-slate-50 rounded-full h-2 border border-slate-100">
                            <div
                                className={clsx("h-full rounded-full transition-all duration-1000",
                                    icuOccupancy > 80 ? "bg-red-500" : "bg-blue-500"
                                )}
                                style={{ width: `${icuOccupancy}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Oxygen Supply */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>O2 Supply Reserves</span>
                            <span className={clsx(
                                oxygenLevel < 20 ? "text-red-500" : "text-cyan-500"
                            )}>{oxygenLevel}%</span>
                        </div>
                        <div className="w-full bg-slate-50 rounded-full h-2 border border-slate-100">
                            <div
                                className={clsx("h-full rounded-full transition-all duration-1000",
                                    oxygenLevel < 20 ? "bg-red-500" : "bg-cyan-500"
                                )}
                                style={{ width: `${oxygenLevel}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {liveHospitalStats.map((stat, idx) => (
                        <StatCard key={idx} stat={stat} className="py-4" />
                    ))}
                </div>

                {/* Recent Patient Check-Ins widget */}
                <RecentCheckIns facilityId={user.facilityId} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <BedGrid beds={liveBeds} onBedClick={handleBedClick} />
                    </div>
                    <div className="lg:col-span-1">
                        <EmergencyTicker />
                    </div>
                </div>

                <BedDetailsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    bed={selectedBed}
                    patient={selectedPatient}
                    onAssign={handleAssignPatient}
                    onDischarge={handleDischargePatient}
                    onClean={handleCleanBed}
                    onViewRecord={handleViewRecord}
                    onCheckRisk={setSelectedRiskPatientId}
                />

                {selectedRiskPatientId && user && (
                    <PatientDetailModal
                        facilityId={user.facilityId}
                        patientDocId={selectedRiskPatientId}
                        onClose={() => setSelectedRiskPatientId(null)}
                    />
                )}
            </div>
        );
    }

    // Clinic Layout: Schedule & Queue focused
    if (user.facilityType === 'clinic') {
        return (
            <div className="space-y-6 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Daily Clinic Overview</h1>
                    <p className="text-gray-500">Manage appointments and patient flow</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {clinicStats.map((stat, idx) => (
                        <StatCard key={idx} stat={stat} />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <AppointmentTimeline />
                    </div>
                    <div className="lg:col-span-1">
                        <PatientQueue />
                    </div>
                </div>
            </div>
        );
    }

    // Lab Layout: Process Flow focused
    if (user.facilityType === 'lab') {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lab Processing Unit</h1>
                    <p className="text-gray-500">Sample tracking and equipment status</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {labStats.map((stat, idx) => (
                        <StatCard key={idx} stat={stat} />
                    ))}
                </div>

                <div>
                    <SamplePipeline stages={labPipeline} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2">Critical Alerts</h3>
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100 flex items-start gap-2">
                            <span className="font-bold">!</span> Sample #3903 (BioChem) failed QC check. Retest required.
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
                        <h3 className="font-semibold text-gray-900 mb-2">Equipment Status</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">Cobas 6000 #1</span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Online</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">Sysmex XN #2</span>
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Calibrating</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

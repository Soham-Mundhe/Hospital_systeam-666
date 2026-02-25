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
import { useNavigate } from 'react-router-dom';
import type { Bed, Patient } from '../types';
import { BedDetailsModal } from '../components/dashboard/BedDetailsModal';
import { useHospitalLiveData } from '../hooks/useHospitalLiveData';
import { useLiveBeds } from '../hooks/useLiveBeds';
import { clsx } from 'clsx';


export const Dashboard: FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State for Bed Management (non-hospital facility mock beds kept for modal flow)
    const [beds, setBeds] = useState<Bed[]>([]);
    const [patients, setPatients] = useState<Patient[]>(hospitalPatients);
    const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const handleBedCountChange = (newCount: number, type: Bed['type'] = 'general') => {
        setBeds(prevBeds => {
            const currentCount = prevBeds.length;
            if (newCount > currentCount) {
                // Add new beds
                const newBeds: Bed[] = [];
                for (let i = currentCount; i < newCount; i++) {
                    const prefix = type === 'icu' ? 'I' : type === 'pediatric' ? 'P' : 'G';
                    const ward = type === 'icu' ? 'ICU' : type === 'pediatric' ? 'Pediatric Ward' : 'General Ward';

                    newBeds.push({
                        id: `B-${Date.now()}-${i}`,
                        ward: ward,
                        number: `${prefix}-${i + 1}`,
                        status: 'available',
                        type: type
                    });
                }
                return [...prevBeds, ...newBeds];
            } else if (newCount < currentCount) {
                // Remove beds from the end
                return prevBeds.slice(0, newCount);
            }
            return prevBeds;
        });
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
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            Hospital Command Center
                            {emergencyActive && (
                                <span className="text-xs bg-red-600 text-white px-3 py-1 rounded-full animate-pulse uppercase tracking-wider font-bold">
                                    Emergency Override Active
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-500">Real-time operational status</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Last Updated</p>
                        <div className="flex items-center gap-2 justify-end">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <p className="text-xs text-gray-400">Live Stream</p>
                        </div>
                    </div>
                </div>

                {/* ── Intelligence Centre (real-time Firestore) ── */}
                <HospitalIntelligence facilityId={user.facilityId} />

                {/* Resource Awareness Panel */}
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* General Beds */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium text-slate-300">
                            <span>General Bed Occupancy</span>
                            <span className={clsx(
                                bedOccupancy > 90 ? "text-red-400" : "text-emerald-400"
                            )}>{bedOccupancy}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                            <div
                                className={clsx("h-2.5 rounded-full transition-all duration-1000",
                                    bedOccupancy > 90 ? "bg-red-500" : bedOccupancy > 75 ? "bg-yellow-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${bedOccupancy}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* ICU Capacity */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium text-slate-300">
                            <span>ICU Capacity Stress</span>
                            <span className={clsx(
                                icuOccupancy > 80 ? "text-red-400" : "text-blue-400"
                            )}>{icuOccupancy}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                            <div
                                className={clsx("h-2.5 rounded-full transition-all duration-1000",
                                    icuOccupancy > 80 ? "bg-red-500" : "bg-blue-500"
                                )}
                                style={{ width: `${icuOccupancy}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Oxygen Supply */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium text-slate-300">
                            <span>O2 Supply Reserves</span>
                            <span className={clsx(
                                oxygenLevel < 20 ? "text-red-400" : "text-cyan-400"
                            )}>{oxygenLevel}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                            <div
                                className={clsx("h-2.5 rounded-full transition-all duration-1000",
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
                />
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

export type FacilityType = 'hospital' | 'clinic' | 'lab';

export interface User {
    id: string;
    name: string;
    email: string;
    facilityType: FacilityType;
    facilityId: string; // e.g., H-1234
}

export interface Stat {
    label: string;
    value: string | number;
    change?: string; // e.g., "+12%"
    trend?: 'up' | 'down' | 'neutral';
    icon: string; // Lucide icon name
}

export interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
    status: 'admitted' | 'discharged' | 'critical';
    ward?: string;
    admissionDate: string; // YYYY-MM-DD
    dischargeDate?: string; // YYYY-MM-DD
    symptoms: string[];
    diagnosis: 'flu' | 'dengue' | 'covid' | 'other';
    icuRequired: boolean;
    oxygenRequired: boolean;
    lengthOfStay?: number;
}

export interface Appointment {
    id: string;
    patientName: string;
    doctorName: string;
    time: string;
    type: 'visit' | 'follow-up' | 'emergency';
    status: 'confirmed' | 'pending' | 'completed';
}

export interface LabTest {
    id: string;
    patientName: string;
    testName: string;
    sampleId: string;
    status: 'collected' | 'processing' | 'completed';
    date: string;
    resultUrl?: string;
}

export interface Resource {
    name: string;
    total: number;
    available: number;
    unit: string;
}

export interface Staff {
    id: string;
    name: string;
    role: 'Doctor' | 'Nurse' | 'Technician' | 'Admin';
    department: string;
    shift: 'Morning' | 'Evening' | 'Night';
    status: 'Active' | 'On Leave';
}
// ... existing types
export interface Bed {
    id: string;
    ward: string;
    number: string;
    status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
    patientId?: string;
    patientName?: string;
    type: 'general' | 'icu' | 'pediatric';
}

export interface PipelineStage {
    id: string;
    name: string;
    count: number;
    status: 'active' | 'bottleneck' | 'idle';
}

import type { Appointment, Bed, LabTest, Patient, PipelineStage, Resource, Staff, Stat } from './types';

// --- Hospital Data ---
export const hospitalStats: Stat[] = [
    { label: 'Admissions Today', value: 42, change: '+12%', trend: 'up', icon: 'Users' },
    { label: 'Bed Occupancy', value: '86%', change: '+4%', trend: 'neutral', icon: 'Bed' },
    { label: 'ICU Occupancy', value: '92%', change: '+8%', trend: 'down', icon: 'Activity' },
    { label: 'Oxygen', value: '450 L', change: 'Stable', trend: 'neutral', icon: 'Wind' },
];

export const hospitalPatients: Patient[] = [
    { id: 'P-101', name: 'John Doe', age: 45, gender: 'M', status: 'admitted', ward: 'Ward A - 101', admissionDate: '2023-10-25', symptoms: ['Fever', 'Cough'] },
    { id: 'P-102', name: 'Jane Smith', age: 32, gender: 'F', status: 'critical', ward: 'ICU - 04', admissionDate: '2023-10-27', symptoms: ['Difficulty Breathing'] },
    { id: 'P-103', name: 'Robert Brown', age: 60, gender: 'M', status: 'admitted', ward: 'Ward B - 204', admissionDate: '2023-10-26', symptoms: ['Chest Pain'] },
    { id: 'P-104', name: 'Emily Davis', age: 28, gender: 'F', status: 'discharged', admissionDate: '2023-10-20', symptoms: ['Recovered'] },
    { id: 'P-105', name: 'Michael Wilson', age: 55, gender: 'M', status: 'pending', admissionDate: '2023-10-28', symptoms: ['Fracture'] },
];

export const hospitalResources: Resource[] = [
    { name: 'General Beds', total: 200, available: 45, unit: 'beds' },
    { name: 'ICU Beds', total: 30, available: 2, unit: 'beds' },
    { name: 'Oxygen Cylinders', total: 100, available: 85, unit: 'units' },
    { name: 'Ventilators', total: 20, available: 5, unit: 'units' },
];

// --- Clinic Data ---
export const clinicStats: Stat[] = [
    { label: 'Appointments', value: 24, change: '+5', trend: 'up', icon: 'Calendar' },
    { label: 'Walk-ins', value: 10, change: '-2', trend: 'down', icon: 'UserPlus' },
    { label: 'Doctors Active', value: 6, change: 'Full Staff', trend: 'neutral', icon: 'Stethoscope' },
    { label: 'Avg Wait Time', value: '15 min', change: '-5 min', trend: 'up', icon: 'Clock' },
];

export const clinicAppointments: Appointment[] = [
    { id: 'A-201', patientName: 'Alice Green', doctorName: 'Dr. Sarah Lee', time: '09:00 AM', type: 'visit', status: 'confirmed' },
    { id: 'A-202', patientName: 'Bob White', doctorName: 'Dr. James King', time: '09:30 AM', type: 'follow-up', status: 'confirmed' },
    { id: 'A-203', patientName: 'Charlie Black', doctorName: 'Dr. Sarah Lee', time: '10:00 AM', type: 'emergency', status: 'pending' },
    { id: 'A-204', patientName: 'Diana Red', doctorName: 'Dr. Emily Chen', time: '10:15 AM', type: 'visit', status: 'completed' },
];

export const clinicResources: Resource[] = [
    { name: 'Paracetamol', total: 500, available: 450, unit: 'strips' },
    { name: 'Antibiotics', total: 200, available: 120, unit: 'strips' },
    { name: 'Syringes', total: 1000, available: 800, unit: 'units' },
];

// --- Lab Data ---
export const labStats: Stat[] = [
    { label: 'Pending Samples', value: 15, change: '+3', trend: 'down', icon: 'FlaskConical' },
    { label: 'Processing', value: 8, change: 'Active', trend: 'neutral', icon: 'Loader' },
    { label: 'Reports Ready', value: 45, change: '+20', trend: 'up', icon: 'FileCheck' },
    { label: 'Equipment Status', value: 'All OK', change: '', trend: 'neutral', icon: 'CheckCircle' },
];

export const labTests: LabTest[] = [
    { id: 'T-301', patientName: 'Evan Hall', testName: 'Blood Count (CBC)', sampleId: 'S-1001', status: 'completed', date: '2023-10-28' },
    { id: 'T-302', patientName: 'Fiona Hill', testName: 'Lipid Profile', sampleId: 'S-1002', status: 'processing', date: '2023-10-28' },
    { id: 'T-303', patientName: 'George Adams', testName: 'Thyroid Panel', sampleId: 'S-1003', status: 'collected', date: '2023-10-28' },
];

export const labResources: Resource[] = [
    { name: 'Reagents (Type A)', total: 50, available: 42, unit: 'bottles' },
    { name: 'Test Tubes', total: 2000, available: 1500, unit: 'units' },
    { name: 'Microscope Slides', total: 1000, available: 950, unit: 'boxes' },
];

// --- Staff Data (Common Structure, could differ slightly) ---
export const staffList: Staff[] = [
    { id: 'S-001', name: 'Dr. Sarah Lee', role: 'Doctor', department: 'Cardiology', shift: 'Morning', status: 'Active' },
    { id: 'S-002', name: 'Nurse Mary', role: 'Nurse', department: 'ICU', shift: 'Night', status: 'Active' },
    { id: 'S-003', name: 'Tech Kevin', role: 'Technician', department: 'Lab', shift: 'Evening', status: 'On Leave' },
    { id: 'S-004', name: 'Dr. James King', role: 'Doctor', department: 'General', shift: 'Morning', status: 'Active' },
];
// ... existing data

export const hospitalBeds: Bed[] = [
    { id: 'B-101', ward: 'General Ward A', number: 'A-01', status: 'occupied', patientName: 'John Doe', type: 'general' },
    { id: 'B-102', ward: 'General Ward A', number: 'A-02', status: 'available', type: 'general' },
    { id: 'B-103', ward: 'General Ward A', number: 'A-03', status: 'occupied', patientName: 'Robert Brown', type: 'general' },
    { id: 'B-104', ward: 'General Ward A', number: 'A-04', status: 'cleaning', type: 'general' },
    { id: 'B-105', ward: 'General Ward A', number: 'A-05', status: 'available', type: 'general' },
    { id: 'B-106', ward: 'General Ward A', number: 'A-06', status: 'occupied', patientName: 'Alice Green', type: 'general' },
    { id: 'I-01', ward: 'ICU', number: 'ICU-1', status: 'occupied', patientName: 'Jane Smith', type: 'icu' },
    { id: 'I-02', ward: 'ICU', number: 'ICU-2', status: 'maintenance', type: 'icu' },
    { id: 'I-03', ward: 'ICU', number: 'ICU-3', status: 'available', type: 'icu' },
];

export const labPipeline: PipelineStage[] = [
    { id: 'S1', name: 'Sample Intake', count: 12, status: 'active' },
    { id: 'S2', name: 'Centrifuge', count: 8, status: 'active' },
    { id: 'S3', name: 'Analyzer A', count: 15, status: 'bottleneck' },
    { id: 'S4', name: 'Review', count: 5, status: 'idle' },
    { id: 'S5', name: 'Report Gen', count: 2, status: 'active' },
];

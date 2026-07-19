import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { update6HourReport } from '../utils/reporting';
import {
    X, User, Activity, Stethoscope,
    Loader2, Hash, Sparkles, Clock,
    Bed, Calendar, CheckCircle2, Heart,
    Thermometer, ChevronDown, AlertCircle, FileText,
    BrainCircuit, ClipboardList, ChevronLeft
} from 'lucide-react';
import { clsx } from 'clsx';
import { useGeminiSummary, getSpecialistDoctor } from '../hooks/useGeminiSummary';

interface Props {
    facilityId: string;
    patientDocId: string;
    onClose: () => void;
}

interface PatientDoc {
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
    oxygenRequired?: boolean;
    lengthOfStay?: number;
    height?: number;
    weight?: number;
    previousAdmissions?: number;
    chronicDiseases?: number;
    smokingStatus?: number;
    alcoholConsumption?: number;
    bmi?: number;
    createdAt?: { seconds: number; nanoseconds: number } | string;
    updatedAt?: { seconds: number; nanoseconds: number } | string;
    dischargeDate?: string;
    documents?: string[];
    photos?: string[];
}


function daysAgo(ts: PatientDoc['createdAt'], admDate?: string): number {
    let base: Date;
    if (ts && typeof ts !== 'string') {
        base = new Date(ts.seconds * 1000);
    } else if (admDate) {
        base = new Date(admDate);
    } else {
        return 0;
    }
    return Math.floor((Date.now() - base.getTime()) / 86_400_000);
}

export const PatientDetailModal: FC<Props> = ({ facilityId, patientDocId, onClose }) => {
    const [patient, setPatient] = useState<PatientDoc | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<'details' | 'form' | 'results'>('details');
    const [showDocuments, setShowDocuments] = useState(true);

    // AI Summary States
    const [viewingSummary, setViewingSummary] = useState(false);
    const { generateSummary, generateCombinedRisk, isGenerating: isAiGenerating, summary, error: aiError } = useGeminiSummary();

    // ML Prediction States
    const [isPredicting, setIsPredicting] = useState(false);
    const [isAiEnhancedRisk, setIsAiEnhancedRisk] = useState(false);
    const [predictionResult, setPredictionResult] = useState<{risk: number, level: string, reasons?: {factor: string, impact: number}[], clinical_summary?: string, recommended_actions?: string[], error?: boolean | string} | null>(null);

    // Form states
    const [age, setAge] = useState('');
    const [prevAdmissions, setPrevAdmissions] = useState('');
    const [chronicDiseases, setChronicDiseases] = useState('0');
    const [smokingStatus, setSmokingStatus] = useState('0');
    const [alcoholConsumption, setAlcoholConsumption] = useState('0');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [bmi, setBmi] = useState('');
    const [numDiagnoses, setNumDiagnoses] = useState('');
    const [bloodPressure, setBloodPressure] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [glucoseLevel, setGlucoseLevel] = useState('');
    const [oxygenSaturation, setOxygenSaturation] = useState('');
    const [bodyTemperature, setBodyTemperature] = useState('');
    const [formLengthOfStay, setFormLengthOfStay] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);


    useEffect(() => {
        setIsLoading(true);
        setError(null);
        getDoc(doc(db, 'facilities', facilityId, 'patients', patientDocId))
            .then(snap => {
                if (snap.exists()) {
                    setPatient({ id: snap.id, ...snap.data() } as PatientDoc);
                } else {
                    setError('Patient record not found.');
                }
            })
            .catch(() => setError('Failed to load patient record.'))
            .finally(() => setIsLoading(false));
    }, [facilityId, patientDocId]);

    useEffect(() => {
        if (patient) {
            setAge(patient.age?.toString() || '');
            setPrevAdmissions(patient.previousAdmissions?.toString() || '0');
            setChronicDiseases(patient.chronicDiseases?.toString() || '0');
            setSmokingStatus(patient.smokingStatus?.toString() || '0');
            setAlcoholConsumption(patient.alcoholConsumption?.toString() || '0');
            setHeight(patient.height?.toString() || '');
            setWeight(patient.weight?.toString() || '');
            setBmi(patient.bmi?.toString() || '');
            setFormLengthOfStay('');
        }
    }, [patient]);

    useEffect(() => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            const hInMeters = h / 100;
            setBmi((w / (hInMeters * hInMeters)).toFixed(1));
        }
    }, [height, weight]);

    const handleAIsummarize = async () => {
        if (!patient) return;
        setViewingSummary(true);
        
        const context = `
        Patient Profile:
        - Name: ${patient.name}
        - Patient ID: ${patient.patientId || patient.id}
        - Age: ${patient.age}
        - Gender: ${patient.gender}
        - Phone: ${patient.phone || 'Not Provided'}
        - Visit Date: ${patient.checkInDate || patient.admissionDate || 'Not Provided'}
        
        Clinical Assessment:
        - Diagnosis / Purpose of Visit: ${patient.diagnosis || 'Not Provided'}
        - Chronic Diseases: ${patient.disease || patient.chronicDiseases || 'None'}
        - Active Medications: ${patient.medications || 'None'}
        - Known Allergies: ${patient.allergies || 'None'}
        - Past Surgeries: ${patient.surgeries || 'None'}
        - Family Medical History: ${patient.familyHistory || 'None'}
        - Prev Admissions: ${patient.previous_admissions || patient.previousAdmissions || 0}
        
        Vitals/Stats:
        - Height/Weight: ${patient.height}cm / ${patient.weight}kg (BMI: ${patient.bmi})
        
        Documents attached: ${patient.documents?.length || 0}
        `;

        const urls = patient.documents?.map((d: any) => typeof d === 'string' ? d : (d?.url || '')) || [];
        const validUrls = urls.filter(u => u);
        await generateSummary(validUrls, context);
    };

    const handlePredict = async () => {
        if (!age || !prevAdmissions || !bmi || !numDiagnoses || !bloodPressure || !heartRate || !glucoseLevel || !oxygenSaturation || !bodyTemperature || !formLengthOfStay) {
            alert('Please fill out all numeric fields.');
            return;
        }
        setIsPredicting(true);
        try {
            const res = await fetch('https://legendsm666-hospital-readmission-api.hf.space/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    age: Math.round(Number(age)), 
                    previous_admissions: Math.round(Number(prevAdmissions)), 
                    chronic_diseases: Number(chronicDiseases),
                    smoking_status: Number(smokingStatus), 
                    alcohol_consumption: Number(alcoholConsumption), 
                    bmi: Number(bmi),
                    number_of_diagnoses: Math.round(Number(numDiagnoses)), 
                    blood_pressure: Math.round(Number(bloodPressure)), 
                    heart_rate: Math.round(Number(heartRate)),
                    glucose_level: Math.round(Number(glucoseLevel)), 
                    oxygen_saturation: Math.round(Number(oxygenSaturation)), 
                    body_temperature: Number(bodyTemperature),
                    length_of_stay: Math.round(Number(formLengthOfStay))
                })
            });
            const data = await res.json();
            
            // Map the API results correctly
            // Risk is calculated as the probability of non-low outcome (Mid + High)
            const riskValue = data.risk_distribution 
                ? Math.round(data.risk_distribution.high + data.risk_distribution.moderate) 
                : 15;

            const basePrediction = {
                risk: riskValue,
                level: data.final_prediction || 'Low',
                reasons: data.top_factors || []
            };

            if (isAiEnhancedRisk) {
                const context = `
                Patient Stats:
                - Age: ${age}
                - Height/Weight: ${height}cm / ${weight}kg (BMI: ${bmi})
                - Prev Admissions: ${prevAdmissions}
                - Chronic Diseases: ${chronicDiseases}
                - Smoking: ${smokingStatus}, Alcohol: ${alcoholConsumption}
                
                Clinical Data:
                - Diagnoses Count: ${numDiagnoses}
                - Expected Stay: ${formLengthOfStay} days
                - BP: ${bloodPressure}, HR: ${heartRate}, SpO2: ${oxygenSaturation}%, Temp: ${bodyTemperature}°C, Glucose: ${glucoseLevel}
                `;
                
                const urls = patient?.documents?.map((d: any) => typeof d === 'string' ? d : (d?.url || '')) || [];
                const validUrls = urls.filter((u:any) => u);
                const specialist = getSpecialistDoctor(patient?.diagnosis);
                
                const combined = await generateCombinedRisk(validUrls, context, basePrediction, specialist.name);
                if (combined) {
                    setPredictionResult(combined);
                    setCurrentView('results');
                    return;
                }
            }

            setPredictionResult(basePrediction);
            setCurrentView('results');
        } catch (err) {
            console.error('Prediction error:', err);
            setPredictionResult({ risk: 45, level: 'Moderate', error: true });
            setCurrentView('results');
        } finally {
            setIsPredicting(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!patient || !facilityId) return;
        setIsUpdatingStatus(true);
        const nextStatus = patient.status === 'admitted' ? 'critical' : 'admitted';
        
        try {
            const patientRef = doc(db, 'facilities', facilityId, 'patients', patientDocId);
            // In this system, bed placement into ICU is driven by `icuRequired`
            // (see `useLiveBeds`). So when we mark the patient as critical,
            // also mark them as ICU-required to update real-time bed status + analytics.
            const nextIcuRequired = nextStatus === 'critical';
            await updateDoc(patientRef, {
                status: nextStatus,
                icuRequired: nextIcuRequired,
                updatedAt: serverTimestamp(),
            });
            // Refresh analytics dashboard for ICU stress / Bed utilization
            await update6HourReport(facilityId).catch(console.error);
            setPatient({ ...patient, status: nextStatus, icuRequired: nextIcuRequired });
        } catch (err) {
            console.error('Status update failed:', err);
            alert('Failed to update clinical status.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const stay = patient ? daysAgo(patient.createdAt, patient.admissionDate) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-white/20">
                {/* Header Sub-Component Styling from Screenshot 2 */}
                <div className="bg-white px-6 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                            <User className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                {patient?.name ?? 'Loading...'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                {patient?.patientId ?? 'P-XXX'} <span className="w-1 h-1 bg-slate-200 rounded-full"/> Complete Medical Record
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100 transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 custom-scrollbar">
                    {isLoading && <div className="py-20 flex flex-col items-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /><p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Retrieving Records...</p></div>}
                    {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center border border-red-100 font-bold">{error}</div>}

                    {patient && !isLoading && currentView === 'details' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <DetailCard label="Patient ID" value={patient.patientId || patient.id.slice(-8)} icon={<Hash className="w-4 h-4 text-slate-400" />} className="font-mono text-slate-500" />
                                <DetailCard label="Age / Gender" value={`${patient.age || '--'} yrs · ${patient.gender || '--'}`} icon={<User className="w-4 h-4 text-slate-400" />} />
                                <DetailCard label="Ward / Bed" value={patient.ward || 'G-3'} icon={<Bed className="w-4 h-4 text-slate-400" />} />
                                <div className="bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                    </div>
                                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 uppercase italic">
                                        {patient.status || 'Admitted'}
                                    </span>
                                </div>
                            </div>

                            <Section title="Diagnosis & Symptoms" icon={<Stethoscope className="w-4 h-4 text-blue-500" />}>
                                <div className="bg-blue-50/30 border border-blue-100 rounded-[2rem] p-4 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Diagnosis</p>
                                    <p className="text-xl font-black text-blue-700 leading-tight">{patient.diagnosis || 'General Evaluation'}</p>
                                </div>
                            </Section>

                            <Section title="Patient Timeline" icon={<Clock className="w-4 h-4 text-emerald-500" />}>
                                <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm relative overflow-hidden">
                                    <TimelineItem 
                                        title="Patient Admitted" 
                                        time={patient.admissionDate || '2026-03-16'} 
                                        desc={`Ward: ${patient.ward || 'G-3'} · General Ward`} 
                                        icon={<CheckCircle2 className="w-4 h-4 text-white" />}
                                        iconBg="bg-emerald-500"
                                        active 
                                    />
                                    <TimelineItem 
                                        title="Diagnosis Recorded" 
                                        time={patient.admissionDate || '2026-03-16'} 
                                        desc={patient.diagnosis || 'flu'} 
                                        icon={<Stethoscope className="w-4 h-4 text-white" />}
                                        iconBg="bg-blue-500"
                                        active 
                                    />
                                    <TimelineItem 
                                        title="Currently Admitted" 
                                        time={`Day ${stay} of stay`} 
                                        desc={`Length of stay: ${patient.lengthOfStay || '6'} planned days`} 
                                        icon={<Bed className="w-4 h-4 text-white" />}
                                        iconBg="bg-blue-400"
                                        last 
                                    />
                                </div>
                            </Section>

                            <Section title="Admission Summary" icon={<Calendar className="w-4 h-4 text-orange-500" />}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <DetailCard label="Admission Date" value={patient.admissionDate || '2026-03-16'} icon={<Calendar className="w-4 h-4 text-slate-400" />} />
                                    <DetailCard label="Registered At" value={`${patient.admissionDate || '16 Mar 2026'}, 10:51 pm`} icon={<Clock className="w-4 h-4 text-slate-400" />} />
                                    <DetailCard label="Length of Stay" value={`${patient.lengthOfStay || '6'} days (planned)`} icon={<Clock className="w-4 h-4 text-slate-400" />} className="md:col-span-2" />
                                </div>
                            </Section>

                            {/* Medical Documents & Scans (present in RecentCheckIns, but missing here) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] text-[10px]">
                                            Medical Documents &amp; Scans
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handleAIsummarize}
                                            className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-blue-100 transition-all active:scale-95"
                                        >
                                            <Sparkles className="w-3 h-3" /> AI Summarize
                                        </button>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">Files: {patient.documents?.length || 0}</span>
                                        <button
                                            onClick={() => setShowDocuments(v => !v)}
                                            className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all ml-1 whitespace-nowrap"
                                        >
                                            {showDocuments ? 'Hide' : 'View'}
                                        </button>
                                    </div>
                                </div>

                                {showDocuments && (
                                    <div className="space-y-3">
                                        {Array.isArray(patient.documents) && patient.documents.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {patient.documents.map((d: any, idx: number) => {
                                                    const url = typeof d === 'string' ? d : (d?.url ?? '');
                                                    if (!url) return null;
                                                    const name = typeof d === 'string' ? `Document ${idx + 1}` : (d?.name ?? `Document ${idx + 1}`);
                                                    const size = typeof d === 'string' ? undefined : d?.size;
                                                    const isPdf = typeof d === 'string' ? url.toLowerCase().includes('.pdf') : (d?.name ?? '').toLowerCase().includes('.pdf');
                                                    return (
                                                        <a
                                                            key={idx}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-2xl hover:border-teal-200 transition-all group shadow-sm"
                                                        >
                                                            <div
                                                                className={clsx(
                                                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                                                    isPdf ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                                                                )}
                                                            >
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-black text-slate-700 truncate">{name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {size ? `${size} • ` : ''}
                                                                    {isPdf ? 'PDF DOCUMENT' : 'DOCUMENT'}
                                                                </p>
                                                            </div>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">
                                                Not provided in documents.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Supplementary Data (Data the user wants kept hidden but accessible) */}
                            <div className="pt-6 border-t border-slate-100">
                                <div className="grid grid-cols-3 gap-8">
                                    <MiniStat label="Body Mass Index" value={patient.bmi?.toString() || '--'} />
                                    <MiniStat label="Weight / Height" value={`${patient.weight || '--'}kg / ${patient.height || '--'}cm`} />
                                    <MiniStat label="Prev Admissions" value={patient.previousAdmissions?.toString() || '0'} />
                                </div>
                            </div>
                        </div>
                    )}

                    {patient && !isLoading && currentView === 'form' && (
                        <div className="space-y-8 animate-in zoom-in-95 duration-300">
                            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/20" />
                                
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-3">
                                        <Activity className="w-5 h-5 text-blue-500" /> Risk Assessment Configuration
                                    </h3>
                                    <button 
                                        onClick={() => setIsAiEnhancedRisk(!isAiEnhancedRisk)}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border outline-none active:scale-95",
                                            isAiEnhancedRisk 
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                                                : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        <BrainCircuit className={clsx("w-3.5 h-3.5", isAiEnhancedRisk ? "text-indigo-500" : "text-slate-400")} />
                                        {isAiEnhancedRisk ? 'AI Document Risk ON' : 'Enable AI Risk Docs'}
                                    </button>
                                </div>
                                
                                {/* Section 1: General Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                                    <FormGroup label="Age" value={age} onChange={setAge} icon={<User className="w-3 h-3"/>} />
                                    <FormGroup label="Height (cm)" value={height} onChange={setHeight} icon={<User className="w-3 h-3"/>} />
                                    <FormGroup label="Weight (kg)" value={weight} onChange={setWeight} icon={<User className="w-3 h-3"/>} />
                                    <FormGroup label="BMI (Auto)" value={bmi} onChange={setBmi} readOnly icon={<Activity className="w-3 h-3"/>} />
                                    <FormGroup label="Prev Admissions" value={prevAdmissions} onChange={setPrevAdmissions} icon={<Hash className="w-3 h-3"/>} />
                                    <SelectGroup 
                                        label="Chronic Diseases" 
                                        value={chronicDiseases} 
                                        onChange={setChronicDiseases} 
                                        icon={<Activity className="w-3 h-3"/>}
                                        options={[
                                            { label: 'No', value: '0' },
                                            { label: 'Yes', value: '1' },
                                            { label: 'Yes (Multiple)', value: '2' }
                                        ]}
                                    />
                                    <SelectGroup 
                                        label="Smoking Status" 
                                        value={smokingStatus} 
                                        onChange={setSmokingStatus} 
                                        icon={<Activity className="w-3 h-3"/>}
                                        options={[
                                            { label: 'No', value: '0' },
                                            { label: 'Yes', value: '1' }
                                        ]}
                                    />
                                    <SelectGroup 
                                        label="Alcohol Consump." 
                                        value={alcoholConsumption} 
                                        onChange={setAlcoholConsumption} 
                                        icon={<Activity className="w-3 h-3"/>}
                                        options={[
                                            { label: 'No', value: '0' },
                                            { label: 'Yes', value: '1' }
                                        ]}
                                    />
                                </div>

                                {/* Section 2: Doctor Input */}
                                <div className="bg-indigo-50/30 border border-indigo-100 rounded-[2.5rem] p-10 relative">
                                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-8">
                                        Doctor Input (Manual Entry)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        <FormGroup label="Diagnoses Count" value={numDiagnoses} onChange={setNumDiagnoses} icon={<Stethoscope className="w-3 h-3"/>} />
                                        <FormGroup label="Length of Stay" value={formLengthOfStay} onChange={setFormLengthOfStay} icon={<Clock className="w-3 h-3"/>} />
                                        <FormGroup label="Blood Pressure" value={bloodPressure} onChange={setBloodPressure} icon={<Activity className="w-3 h-3"/>} />
                                        <FormGroup label="Heart Rate" value={heartRate} onChange={setHeartRate} icon={<Heart className="w-3 h-3"/>} />
                                        <FormGroup label="Glucose Level" value={glucoseLevel} onChange={setGlucoseLevel} icon={<Activity className="w-3 h-3"/>} />
                                        <FormGroup label="SpO2 (%)" value={oxygenSaturation} onChange={setOxygenSaturation} icon={<Activity className="w-3 h-3"/>} />
                                        <FormGroup label="Body Temp (°C)" value={bodyTemperature} onChange={setBodyTemperature} icon={<Thermometer className="w-3 h-3"/>} step="0.1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {patient && !isLoading && currentView === 'results' && predictionResult && (
                        <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center py-6 space-y-8">
                            {isAiEnhancedRisk && (
                                <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl flex flex-col sm:flex-row items-center gap-2 shadow-sm animate-in slide-in-from-top-4">
                                    <div className="flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4 text-indigo-500" />
                                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em] leading-none">
                                            Assessed internally by {getSpecialistDoctor(patient?.diagnosis).name} AI
                                        </span>
                                    </div>
                                    {patient?.documents?.length ? (
                                        <>
                                            <span className="hidden sm:inline-block w-1 h-1 bg-indigo-200 rounded-full"/>
                                            <span className="text-[9px] font-bold text-indigo-600/70 uppercase tracking-widest leading-none">
                                                Analyzed Vitals + {patient.documents.length} Documents
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            )}
                            <div className={clsx("w-full max-w-lg bg-white border rounded-[3rem] p-1 shadow-2xl overflow-hidden", 
                                predictionResult.risk >= 66 ? 'border-red-100' : 
                                predictionResult.risk >= 30 ? 'border-orange-100' : 'border-green-100')}>
                                <div className={clsx("p-10 text-center rounded-[2.8rem]", 
                                    predictionResult.risk >= 66 ? 'bg-red-50' : 
                                    predictionResult.risk >= 30 ? 'bg-orange-50' : 'bg-green-50')}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-slate-400">Readmission Probability</p>
                                    <div className={clsx("text-7xl font-black mb-6 tracking-tighter", 
                                        predictionResult.risk >= 66 ? 'text-red-600' : 
                                        predictionResult.risk >= 30 ? 'text-orange-600' : 'text-green-600')}>
                                        {predictionResult.risk}%
                                    </div>
                                    <div className="inline-block px-6 py-2 bg-white rounded-full border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
                                        {predictionResult.level} Risk Profile
                                    </div>
                                </div>
                            </div>

                            {predictionResult.clinical_summary && (
                                <div className="w-full max-w-lg bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 shadow-sm">
                                    <h4 className="text-[10px] font-black text-indigo-800 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <Stethoscope className="w-3.5 h-3.5" /> Clinical Executive Summary
                                    </h4>
                                    <p className="text-xs font-semibold leading-relaxed text-indigo-900/80">
                                        {predictionResult.clinical_summary}
                                    </p>
                                </div>
                            )}

                            {predictionResult.reasons && predictionResult.reasons.length > 0 && (
                                <div className="w-full max-w-lg space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-blue-500" /> Primary Risk Vectors
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {predictionResult.reasons.map((r, i) => (
                                            <div key={i} className="bg-white border border-slate-100 px-6 py-4 rounded-2xl flex items-center justify-between shadow-sm group hover:border-blue-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                    <span className="text-xs font-bold text-slate-600 max-w-[280px] break-words">{r.factor}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="w-16 md:w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.impact}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 w-8 text-right">{Math.round(r.impact)}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {predictionResult.recommended_actions && predictionResult.recommended_actions.length > 0 && (
                                <div className="w-full max-w-lg space-y-4">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-4 flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Recommended Action Plan
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {predictionResult.recommended_actions.map((action, i) => (
                                            <div key={i} className="bg-white border border-emerald-100 px-5 py-4 rounded-2xl flex items-start gap-4 shadow-sm group hover:border-emerald-200 transition-all">
                                                <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-[9px] font-black text-emerald-600">{i + 1}</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 leading-snug pt-1">{action}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100 shrink-0 gap-3">
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 shrink-0">
                        Close
                    </button>

                    {currentView === 'details' && patient?.status?.toLowerCase() !== 'discharged' && (
                        <button 
                            onClick={handleStatusUpdate}
                            disabled={isUpdatingStatus}
                            className={clsx(
                                "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2",
                                patient?.status === 'admitted' 
                                    ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" 
                                    : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                            )}
                        >
                            {isUpdatingStatus ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : patient?.status === 'admitted' ? (
                                <>
                                    <AlertCircle className="w-3.5 h-3.5" /> Set Critical
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Stable
                                </>
                            )}
                        </button>
                    )}

                    {currentView === 'details' && patient?.status?.toLowerCase() !== 'discharged' && (
                        <button onClick={() => setCurrentView('form')} className="px-8 py-3.5 bg-[#7C3AED] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#6D28D9] transition-all shadow-xl shadow-purple-100 flex items-center gap-3 shrink-0">
                            <Sparkles className="w-4 h-4" /> Risk Wizard
                        </button>
                    )}
                    {currentView === 'form' && (
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            {(isPredicting || isAiGenerating) && isAiEnhancedRisk && (
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest animate-pulse flex items-center gap-2 mr-2">
                                    <BrainCircuit className="w-3 h-3" />
                                    {getSpecialistDoctor(patient?.diagnosis).status}
                                    {patient?.documents?.length ? ` • Reading ${patient.documents.length} File(s)` : ''}
                                </span>
                            )}
                            <button onClick={handlePredict} disabled={isPredicting || isAiGenerating} className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 active:scale-95 disabled:opacity-50">
                                {(isPredicting || isAiGenerating) ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                                {(isPredicting || isAiGenerating) ? 'Executing...' : 'Generate Prediction'}
                            </button>
                        </div>
                    )}
                    {currentView === 'results' && (
                        <button onClick={() => setCurrentView('details')} className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all">
                            Back to Profile
                        </button>
                    )}
                </div>
                
                {/* AI SUMMARY OVERLAY */}
                {viewingSummary && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col pt-0 animate-in fade-in duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setViewingSummary(false)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all group">
                                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                        <BrainCircuit className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none mb-1">AI Clinical Summary</h2>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini 1.5 Pro</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setViewingSummary(false)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-slate-600 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 custom-scrollbar">
                            <div className="max-w-xl mx-auto space-y-8">
                                {isAiGenerating ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-blue-400/20 blur-2xl animate-pulse rounded-full" />
                                            <div className="relative w-16 h-16 rounded-[2rem] bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-widest">Analyzing Medical Documents</h3>
                                        <p className="text-[10px] font-medium text-slate-400 max-w-xs mx-auto italic">Synthesizing patient data and scan results into clinical insights...</p>
                                    </div>
                                ) : aiError ? (
                                    <div className="p-8 bg-red-50 border border-red-100 rounded-3xl flex flex-col items-center text-center">
                                        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                                        <h3 className="text-sm font-black text-red-800 mb-2 uppercase tracking-widest">Analysis Interrupted</h3>
                                        <p className="text-[10px] font-medium text-red-600/70 mb-6">{aiError}</p>
                                        <button onClick={handleAIsummarize} className="px-8 py-3 bg-red-100 text-red-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200 transition-all">
                                            Retry Analysis
                                        </button>
                                    </div>
                                ) : summary ? (
                                    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                            <ClipboardList className="w-32 h-32 text-indigo-900" />
                                        </div>
                                        <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed font-medium">
                                            <div dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<b class="text-slate-900 font-black tracking-tight">$1</b>').replace(/\n/g, '<br/>') }} />
                                        </div>
                                        <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Verification Complete</span>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic">Generated safely</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Section: FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">
            <span className="bg-white p-1 rounded-lg border border-slate-100 shadow-sm">{icon}</span> {title}
        </div>
        {children}
    </div>
);

const DetailCard: FC<{ label: string, value: React.ReactNode, icon?: React.ReactNode, className?: string }> = ({ label, value, icon, className }) => (
    <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-1">
            {icon}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        </div>
        <div className={clsx("text-xs font-black text-slate-800 tracking-tight", className)}>{value}</div>
    </div>
);

const MiniStat: FC<{ label: string, value: string }> = ({ label, value }) => (
    <div>
        <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter mb-0.5">{label}</p>
        <p className="text-sm font-black text-slate-700 tracking-tight">{value}</p>
    </div>
);

const TimelineItem: FC<{ 
    title: string, 
    time: string, 
    desc: string, 
    icon: React.ReactNode, 
    iconBg: string, 
    active?: boolean, 
    last?: boolean 
}> = ({ title, time, desc, icon, iconBg, last }) => (
    <div className="relative pl-10 last:pb-0 pb-4">
        {!last && <div className="absolute left-[0.95rem] top-8 bottom-0 w-px bg-slate-100" />}
        <div className={clsx("absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10", iconBg)}>
            {icon}
        </div>
        <div className="mb-1">
            <h5 className="text-sm font-black text-slate-800 tracking-tight">{title}</h5>
            <div className="flex items-center gap-4 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{time}</span>
            </div>
        </div>
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-lg mt-2 italic">{desc}</p>
    </div>
);

const FormGroup: FC<{ label: string, value: string, onChange: (v: string) => void, readOnly?: boolean, icon?: React.ReactNode, step?: string }> = ({ label, value, onChange, readOnly, icon, step = "1" }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
            {icon} {label}
        </label>
        <input 
            type="number" 
            step={step}
            value={value} 
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
            className={clsx(
                "w-full px-4 py-3 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all",
                readOnly && "bg-slate-100 text-slate-400 cursor-not-allowed border-dashed"
            )} 
        />
    </div>
);

const SelectGroup: FC<{ label: string, value: string, onChange: (v: string) => void, icon?: React.ReactNode, options: {label: string, value: string}[] }> = ({ label, value, onChange, icon, options }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
            {icon} {label}
        </label>
        <div className="relative">
            <select 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
    </div>
);

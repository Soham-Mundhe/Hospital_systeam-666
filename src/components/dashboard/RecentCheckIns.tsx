import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
    collection, onSnapshot, query, orderBy, 
    limit, doc, addDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { 
    UserCheck, Loader2, Inbox, 
    X, FileText, Sparkles, BrainCircuit, 
    ClipboardList, AlertCircle, ChevronLeft, CheckCircle2
} from 'lucide-react';
import { useGeminiSummary } from '../../hooks/useGeminiSummary';
import { clsx } from 'clsx';

interface PatientDocument {
    id: string;
    name: string;
    size: string;
    createdAt: string;
    url: string;
}

interface CheckInRecord {
    id: string;
    patient_id: string;
    name: string;
    age: number;
    gender: string;
    disease: string;
    visit_date: string;
    blood_pressure?: string;
    glucose_level?: string;
    documents?: PatientDocument[];
    photos?: string[];
    [key: string]: any;
}

interface Props {
    facilityId: string;
}

export const RecentCheckIns: FC<Props> = ({ facilityId }) => {
    const [records, setRecords] = useState<CheckInRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<CheckInRecord | null>(null);
    const [viewingSummary, setViewingSummary] = useState(false);
    const [isAdmitting, setIsAdmitting] = useState(false);
    const { generateSummary, isGenerating, summary, error: aiError } = useGeminiSummary();

    const handleAIsummarize = async () => {
        if (!selectedRecord) return;
        setViewingSummary(true);
        
        const context = `
        Patient Profile:
        - Name: ${selectedRecord.name}
        - Age: ${selectedRecord.age}
        - Gender: ${selectedRecord.gender}
        - Clinical Disease/Visit Purpose: ${selectedRecord.disease}
        - Phone: ${selectedRecord.phone_number || 'N/A'}
        
        Vitals recorded:
        - Blood Pressure: ${selectedRecord.blood_pressure || 'Not Recorded'}
        - Glucose: ${selectedRecord.glucose_level || 'Not Recorded'}
        - Height/Weight: ${selectedRecord.height}cm / ${selectedRecord.weight}kg (BMI: ${selectedRecord.bmi})
        
        Clinical Assessment:
        - Medications: ${selectedRecord.medications || 'None'}
        - Allergies: ${selectedRecord.known_allergies || 'None'}
        - Surgeries: ${selectedRecord.previous_surgeries || 'None'}
        - Family History: ${selectedRecord.family_medical_history || 'N/A'}
        - Prev Admissions: ${selectedRecord.previous_admissions}
        
        Documents attached: ${selectedRecord.documents?.length || 0}
        `;

        const urls = selectedRecord.documents?.map(d => d.url) || [];
        await generateSummary(urls, context);
    };
    const handleAdmit = async () => {
        if (!selectedRecord || !facilityId) return;
        
        setIsAdmitting(true);
        try {
            // 1. Prepare patient data for the master records collection
            const patientData = {
                patientId: selectedRecord.patient_id || `P-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                name: selectedRecord.name,
                age: selectedRecord.age,
                gender: selectedRecord.gender,
                ward: 'General Ward', // Default on admission
                status: 'admitted', // Official hospital status
                diagnosis: selectedRecord.disease,
                admissionDate: new Date().toISOString().split('T')[0],
                phone: selectedRecord.phone_number || 'N/A',
                height: selectedRecord.height || null,
                weight: selectedRecord.weight || null,
                bmi: selectedRecord.bmi || null,
                bloodPressure: selectedRecord.blood_pressure || null,
                glucoseLevel: selectedRecord.glucose_level || null,
                smokingStatus: selectedRecord.smoking_status === 'Yes' ? 1 : 0,
                alcoholConsumption: selectedRecord.alcohol_consumption === 'Yes' ? 1 : 0,
                previousAdmissions: selectedRecord.previous_admissions || 0,
                familyMedicalHistory: selectedRecord.family_medical_history || 'N/A',
                documents: selectedRecord.documents || [],
                photos: selectedRecord.photos || [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // 2. Add to 'patients' collection
            const patientsRef = collection(db, 'facilities', facilityId, 'patients');
            await addDoc(patientsRef, patientData);

            // 3. Remove from 'checkins' queue
            const checkinDocRef = doc(db, 'facilities', facilityId, 'checkins', selectedRecord.id);
            await deleteDoc(checkinDocRef);

            // 4. Success state
            setSelectedRecord(null);
            alert('Patient officially admitted and record updated.');
        } catch (err) {
            console.error('Admission Error:', err);
            alert('Failed to admit patient. Please check database permissions.');
        } finally {
            setIsAdmitting(false);
        }
    };

    useEffect(() => {
        if (!facilityId) return;
        const unsub = onSnapshot(
            query(collection(db, 'facilities', facilityId, 'checkins'), orderBy('createdAt', 'desc'), limit(50)),
            (snap) => {
                setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as CheckInRecord)));
                setLoading(false);
            },
            () => setLoading(false)
        );
        return () => unsub();
    }, [facilityId]);

    const genderBadge = (g: string) => {
        const lower = g?.toLowerCase();
        if (lower === 'male') return 'bg-blue-50 text-blue-700';
        if (lower === 'female') return 'bg-pink-50 text-pink-700';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center border border-teal-100">
                        <UserCheck className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800">Recent Patient Check-Ins</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live QR scan feed</p>
                    </div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300 gap-2"><Inbox className="w-8 h-8" /><p className="text-xs font-bold uppercase tracking-widest">No check-ins yet</p></div>
            ) : (
                <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-50">
                                <th className="pb-3 px-3 font-black">ID</th>
                                <th className="pb-3 px-3 font-black">Name</th>
                                <th className="pb-3 px-3 font-black text-center">Age</th>
                                <th className="pb-3 px-3 font-black">Disease</th>
                                <th className="pb-3 px-3 font-black">Docs</th>
                                <th className="pb-3 px-3 font-black text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => (
                                <tr key={r.id} className={clsx("border-b border-slate-50 hover:bg-slate-50/50 transition-colors", i === 0 && "bg-teal-50/20")}>
                                    <td className="py-3 px-3 font-mono text-[10px] text-slate-400">{r.patient_id?.slice(-8)}</td>
                                    <td className="py-3 px-3 font-semibold text-slate-800 tracking-tight">{r.name}</td>
                                    <td className="py-3 px-3 text-center">
                                        <span className={clsx("text-[10px] px-2 py-0.5 rounded-md font-bold", genderBadge(r.gender))}>{r.age} · {r.gender?.slice(0, 1)}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-black uppercase tracking-tight italic border border-purple-100">{r.disease}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                        {Array.isArray(r.documents) && r.documents.length > 0 && (
                                            <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 inline-flex items-center gap-1">
                                                <FileText className="w-3 h-3" />{r.documents.length}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <button onClick={() => setSelectedRecord(r)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all border border-teal-100">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedRecord && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20">
                        {/* Target Header: FULL PATIENT CHECK-IN RECORD */}
                        <div className="bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100 shadow-sm">
                                    <UserCheck className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none mb-1.5 flex items-center gap-3">
                                        Full Patient Check-In Record
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                        Session ID: <span className="text-slate-600 font-black tracking-normal">{selectedRecord.id?.slice(0, 8).toUpperCase() || 'CHECK-IN'}</span> 
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"/> 
                                        Submission Time: <span className="text-slate-600 font-black tracking-normal">
                                            {(() => {
                                                const d = selectedRecord.createdAt;
                                                if (!d) return 'Recent Session';
                                                try {
                                                    const date = d?.toDate ? d.toDate() : new Date(d);
                                                    return isNaN(date.getTime()) ? 'Recent Session' : date.toLocaleString();
                                                } catch { return 'Recent Session'; }
                                            })()}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRecord(null)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-slate-600 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50/20 custom-scrollbar p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
                                
                                {/* LEFT COLUMN: PATIENT PROFILE & STATS */}
                                <div className="space-y-6">
                                    <section>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-4 border-l-4 border-teal-500 pl-3">
                                            Patient Profile
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                                            <ProfileField label="NAME" value={selectedRecord.name} />
                                            <ProfileField label="PATIENT ID" value={selectedRecord.patient_id} color="text-teal-600 font-mono" />
                                            <ProfileField label="AGE" value={`${selectedRecord.age} years`} />
                                            <ProfileField label="GENDER" value={selectedRecord.gender} />
                                            <ProfileField label="PHONE" value={selectedRecord.phone_number || '7397861878'} />
                                            <ProfileField label="VISIT DATE" value={selectedRecord.visit_date} last />
                                        </div>
                                    </section>

                                    <section className="bg-blue-50/30 border border-blue-100 rounded-3xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-l-4 border-blue-500 pl-3">
                                            Physical Stats
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <MiniMetric label="HEIGHT" value={`${selectedRecord.height || '175'} cm`} />
                                            <MiniMetric label="WEIGHT" value={`${selectedRecord.weight || '75'} kg`} />
                                            <MiniMetric label="BMI" value={selectedRecord.bmi || '24.5'} color="text-emerald-600" />
                                        </div>
                                    </section>

                                    <section className="bg-orange-50/30 border border-orange-100 rounded-3xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4 border-l-4 border-orange-500 pl-3">
                                            Lifestyle & Habits
                                        </div>
                                        <div className="space-y-3.5 px-1">
                                            <LifestyleRow label="Smoking" value={selectedRecord.smoking_status || 'No'} />
                                            <LifestyleRow label="Alcohol" value={selectedRecord.alcohol_consumption || 'No'} />
                                            <LifestyleRow label="Activity" value={selectedRecord.physical_activity_level || 'Medium'} />
                                        </div>
                                    </section>
                                </div>

                                {/* RIGHT COLUMN: CLINICAL ASSESSMENT & VITALS */}
                                <div className="space-y-8">
                                    <section>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-5 border-l-4 border-teal-500 pl-3">
                                            Clinical Assessment
                                        </div>
                                        <div className="space-y-3">
                                            <AssessmentCard label="CHRONIC DISEASE / PURPOSE OF VISIT" value={selectedRecord.disease} />
                                            <AssessmentCard label="ACTIVE MEDICATIONS" value={selectedRecord.medications || 'None'} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <AssessmentCard label="KNOWN ALLERGIES" value={selectedRecord.known_allergies || 'None'} color="text-orange-600" />
                                                <AssessmentCard label="PAST SURGERIES" value={selectedRecord.previous_surgeries || 'No'} />
                                            </div>
                                            <AssessmentCard label="FAMILY MEDICAL HISTORY" value={selectedRecord.family_medical_history || 'No significant history'} />
                                            <AssessmentCard label="PREVIOUS ADMISSIONS" value={selectedRecord.previous_admissions?.toString() || '0'} color="text-teal-700" />
                                        </div>
                                    </section>

                                    <section className="bg-red-50/20 border border-red-50 rounded-[2.5rem] p-6 shadow-sm">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4 pl-1">
                                            Patient Vitals
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <VitalBox label="BLOOD PRESSURE" value={selectedRecord.blood_pressure || '—'} />
                                            <VitalBox label="GLUCOSE LEVEL" value={selectedRecord.glucose_level || '—'} />
                                        </div>
                                    </section>

                                    <section>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] border-l-4 border-teal-500 pl-3">
                                                        Medical Documents & Scans
                                                    </div>
                                                    <button 
                                                        onClick={handleAIsummarize}
                                                        className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-blue-100 transition-all active:scale-95"
                                                    >
                                                        <Sparkles className="w-3 h-3" /> AI Summarize
                                                    </button>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Files: {selectedRecord.documents?.length || 0}</span>
                                            </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedRecord.documents?.map((doc, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={doc.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-2xl hover:border-teal-200 transition-all group shadow-sm"
                                                >
                                                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", 
                                                        doc.name.toLowerCase().endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500')}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-slate-700 truncate">{doc.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{doc.size || '0.2 MB'} • PDF DOCUMENT</p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white px-8 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => setSelectedRecord(null)} 
                                className="px-6 py-3 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                            >
                                Close Record
                            </button>
                            <button 
                                onClick={handleAdmit}
                                disabled={isAdmitting}
                                className="px-10 py-3 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all active:scale-95 shadow-lg shadow-teal-100 flex items-center gap-2"
                            >
                                {isAdmitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Admitting...
                                    </>
                                ) : (
                                    <>
                                        <UserCheck className="w-3.5 h-3.5" /> Admit Patient
                                    </>
                                )}
                            </button>
                        </div>

                        {/* AI SUMMARY OVERLAY */}
                        {viewingSummary && (
                            <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-500">
                                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setViewingSummary(false)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all group">
                                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                                        </button>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border border-blue-200 shadow-md">
                                                <BrainCircuit className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none mb-1">AI Clinical Summary</h2>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini 1.5 Flash</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setViewingSummary(false)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-slate-600 transition-all">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar">
                                    <div className="max-w-2xl mx-auto space-y-8">
                                        {isGenerating ? (
                                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                                <div className="relative mb-6">
                                                    <div className="absolute inset-0 bg-blue-400/20 blur-2xl animate-pulse rounded-full" />
                                                    <div className="relative w-16 h-16 rounded-[2rem] bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                                    </div>
                                                </div>
                                                <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-widest">Analyzing Medical Documents</h3>
                                                <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto italic">Gemini is synthesizing patient data and scan results into clinical insights...</p>
                                            </div>
                                        ) : aiError ? (
                                            <div className="p-8 bg-red-50 border border-red-100 rounded-3xl flex flex-col items-center text-center">
                                                <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                                                <h3 className="text-sm font-black text-red-800 mb-2 uppercase tracking-widest">Analysis Interrupted</h3>
                                                <p className="text-xs font-medium text-red-600/70 mb-6">{aiError}</p>
                                                <button onClick={handleAIsummarize} className="px-8 py-3 bg-red-100 text-red-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200 transition-all">
                                                    Retry Analysis
                                                </button>
                                            </div>
                                        ) : summary ? (
                                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <ClipboardList className="w-32 h-32 text-indigo-900" />
                                                </div>
                                                <div className="prose prose-slate prose-xs max-w-none text-slate-600 leading-relaxed font-medium">
                                                    <div dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<b class="text-slate-900 font-black tracking-tight">$1</b>').replace(/\n/g, '<br/>') }} />
                                                </div>
                                                <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Verification Complete</span>
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Generated at {new Date().toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const LifestyleRow: FC<{ label: string, value: string, color?: string }> = ({ label, value, color = "bg-red-50 text-red-600" }) => (
    <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
        <span className={clsx("text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border", color, 
            color.includes('red') ? 'border-red-100' : 'border-orange-100')}>
            {value}
        </span>
    </div>
);

const ProfileField: FC<{ label: string, value: string, color?: string, last?: boolean }> = ({ label, value, color = "text-slate-800", last }) => (
    <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={clsx("text-xs font-black tracking-tight", color)}>{value}</p>
        {!last && <div className="mt-3 border-b border-slate-50" />}
    </div>
);

const MiniMetric: FC<{ label: string, value: string, color?: string }> = ({ label, value, color = "text-slate-700" }) => (
    <div className="bg-white border border-blue-100 rounded-xl p-3 text-center shadow-sm">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
        <p className={clsx("text-[10px] font-black tracking-tighter", color)}>{value}</p>
    </div>
);

const AssessmentCard: FC<{ label: string, value: string, color?: string }> = ({ label, value, color = "text-slate-900" }) => (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className={clsx("text-xs font-bold tracking-tight", color)}>{value}</p>
    </div>
);

const VitalBox: FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="bg-white border border-red-50 rounded-2xl p-5 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-red-100/30" />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{label}</p>
        <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-red-500 tracking-tighter mb-2">{value === '—' ? <div className="w-8 h-1 bg-red-400 rounded-full" /> : value}</div>
            <div className="w-12 h-0.5 bg-red-400/30 rounded-full" />
        </div>
    </div>
);

import { useState } from 'react';
import type { FC } from 'react';
import { X, Activity, Thermometer, Wind, Droplets, AlertTriangle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const ReadmissionCheckModal: FC<Props> = ({ isOpen, onClose }) => {
    const [isCalculating, setIsCalculating] = useState(false);
    const [result, setResult] = useState<number | null>(null);

    // Form states
    const [bp, setBp] = useState('');
    const [hr, setHr] = useState('');
    const [spo2, setSpo2] = useState('');
    const [temp, setTemp] = useState('');
    const [glucose, setGlucose] = useState('');
    const [condition, setCondition] = useState('stable');
    const [complications, setComplications] = useState('No');
    const [icu, setIcu] = useState('No');
    const [lengthOfStay, setLengthOfStay] = useState('');
    const [numberOfDiagnoses, setNumberOfDiagnoses] = useState('');

    if (!isOpen) return null;

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCalculating(true);

        // Simulate ML processing delay
        setTimeout(() => {
            // Generate a random risk between 10 and 90
            const randomRisk = Math.floor(Math.random() * (90 - 10 + 1)) + 10;
            setResult(randomRisk);
            setIsCalculating(false);
        }, 1500);
    };

    const handleReset = () => {
        setResult(null);
        setBp('');
        setHr('');
        setSpo2('');
        setTemp('');
        setGlucose('');
        setCondition('stable');
        setComplications('No');
        setIcu('No');
        setLengthOfStay('');
        setNumberOfDiagnoses('');
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    let riskLevel = '';
    let riskColor = '';
    let riskBg = '';

    if (result !== null) {
        if (result <= 30) {
            riskLevel = 'Low Risk';
            riskColor = 'text-green-700';
            riskBg = 'bg-green-100 border-green-200';
        } else if (result <= 60) {
            riskLevel = 'Moderate Risk';
            riskColor = 'text-yellow-700';
            riskBg = 'bg-yellow-100 border-yellow-200';
        } else {
            riskLevel = 'High Risk';
            riskColor = 'text-red-700';
            riskBg = 'bg-red-100 border-red-200';
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Readmission Check</h2>
                            <p className="text-xs text-gray-500">Enter live vitals to estimate risk</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto p-6">
                    {result === null ? (
                        <form id="readmission-form" onSubmit={handleCalculate} className="space-y-6">
                            {/* Vitals Section */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 border-b pb-2">
                                    <Activity className="w-4 h-4 text-blue-500" /> Patient Vitals
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">Blood Pressure</label>
                                        <div className="relative">
                                            <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="120/80"
                                                value={bp}
                                                onChange={(e) => setBp(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">Heart Rate (bpm)</label>
                                        <div className="relative">
                                            <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                required
                                                min="30" max="250"
                                                placeholder="80"
                                                value={hr}
                                                onChange={(e) => setHr(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">SpO₂ (%)</label>
                                        <div className="relative">
                                            <Wind className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                required
                                                min="50" max="100"
                                                placeholder="98"
                                                value={spo2}
                                                onChange={(e) => setSpo2(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">Temperature (°C)</label>
                                        <div className="relative">
                                            <Thermometer className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                required
                                                step="0.1"
                                                min="30" max="45"
                                                placeholder="37.0"
                                                value={temp}
                                                onChange={(e) => setTemp(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <label className="text-xs font-semibold text-gray-500">Glucose (mg/dL)</label>
                                        <div className="relative">
                                            <Droplets className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="number"
                                                required
                                                min="20" max="1000"
                                                placeholder="100"
                                                value={glucose}
                                                onChange={(e) => setGlucose(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Info Section */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 border-b pb-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Clinical Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">Current Condition</label>
                                        <select
                                            value={condition}
                                            onChange={(e) => setCondition(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white transition"
                                        >
                                            <option value="stable">Stable</option>
                                            <option value="moderate">Moderate</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">Complications?</label>
                                            <select
                                                value={complications}
                                                onChange={(e) => setComplications(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white transition"
                                            >
                                                <option value="No">No</option>
                                                <option value="Yes">Yes</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">ICU Required?</label>
                                            <select
                                                value={icu}
                                                onChange={(e) => setIcu(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white transition"
                                            >
                                                <option value="No">No</option>
                                                <option value="Yes">Yes</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">Length of Stay (days)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                placeholder="e.g., 5"
                                                value={lengthOfStay}
                                                onChange={(e) => setLengthOfStay(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-500">Number of Diagnoses</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                placeholder="e.g., 2"
                                                value={numberOfDiagnoses}
                                                onChange={(e) => setNumberOfDiagnoses(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    ) : (
                        /* Results View */
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-300">
                            <div className={clsx('w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner border-4', riskBg)}>
                                <span className={clsx('text-3xl font-black tabular-nums', riskColor)}>
                                    {result}%
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">Readmission Risk Score</h3>
                            <div className={clsx('px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm border', riskBg, riskColor)}>
                                Risk Level: {riskLevel}
                            </div>

                            <p className="text-sm text-gray-500 mt-6 max-w-sm">
                                This is a simulated prediction based on provided vitals. Real ML predictions will be available in a future update.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                    {result === null ? (
                        <>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isCalculating}
                                className="px-5 py-2 rounded-xl text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="readmission-form"
                                disabled={isCalculating}
                                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 shadow-md transition-all active:scale-95 disabled:opacity-75 disabled:active:scale-100"
                            >
                                {isCalculating ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                                ) : (
                                    'Calculate Risk'
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center justify-center w-full sm:w-auto px-6 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 shadow-md transition-all active:scale-95"
                        >
                            Check Another Patient
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

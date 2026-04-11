import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface OutbreakAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityId: string;
  livePatients?: any[];
}

export const OutbreakAlertModal: FC<OutbreakAlertModalProps> = ({ isOpen, onClose, facilityId, livePatients = [] }) => {
  const [disease, setDisease] = useState('');
  const [area, setArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && livePatients.length > 0) {
      const diseaseCounts = livePatients.reduce((acc, p) => {
        if (p.diagnosis) acc[p.diagnosis] = (acc[p.diagnosis] || 0) + 1;
        return acc;
      }, {});
      const mostCommonDisease = Object.keys(diseaseCounts).sort((a, b) => diseaseCounts[b] - diseaseCounts[a])[0];

      if (mostCommonDisease) setDisease(mostCommonDisease);
      setArea('Downtown Hospital District'); // Default geographical location, not ward
    }
  }, [isOpen, livePatients]);


  if (!isOpen) return null;

  const handleBroadcast = async () => {
    if (!disease.trim() || !area.trim()) {
      alert("Please enter both Disease and Area to broadcast an alert.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'outbreakAlerts'), {
        disease,
        area,
        active: true,
        facilityId,
        message: `A localized spike in ${disease} has been detected in ${area}. Please take preventive measures immediately.`,
        timestamp: serverTimestamp()
      });
      alert("Alert Broadcasted Successfully!");
      onClose();
      setDisease('');
      setArea('');
    } catch (error) {
      console.error("Error broadcasting alert:", error);
      alert("Failed to broadcast alert. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-red-100 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900 leading-none mb-1">Broadcast Alert</h2>
              <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Public Health Warning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Disease Details
                </label>
                <input
                    type="text"
                    placeholder="e.g. Dengue, COVID-19, Cholera"
                    value={disease}
                    onChange={(e) => setDisease(e.target.value)}
                    className="w-full h-12 bg-slate-50 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Affected Area / Location
                </label>
                <input
                    type="text"
                    placeholder="e.g. Downtown District, Sector 4"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full h-12 bg-slate-50 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
             </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBroadcast}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <AlertTriangle className="w-4 h-4" />
            {isSubmitting ? 'Broadcasting...' : 'Broadcast Alert'}
          </button>
        </div>
      </div>
    </div>
  );
};

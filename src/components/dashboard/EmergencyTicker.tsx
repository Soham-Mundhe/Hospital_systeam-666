import type { FC } from 'react';
import { Siren, AlertCircle, Clock } from 'lucide-react';

export const EmergencyTicker: FC = () => {
    const emergencies = [
        { id: 1, type: 'Cardiac Arrest', eta: '5m', status: 'Inbound' },
        { id: 2, type: 'Road Accident (Multiple)', eta: '12m', status: 'Inbound' },
        { id: 3, type: 'Severe Burn', eta: 'Arrived', status: 'ER-1' },
    ];

    return (
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 h-full">
            <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                <Siren className="w-6 h-6 animate-pulse" />
                Emergency Incoming
            </h3>

            <div className="space-y-3">
                {emergencies.map((em) => (
                    <div key={em.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-900">{em.type}</p>
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Status: {em.status}
                            </p>
                        </div>
                        <div className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {em.eta}
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors shadow-sm shadow-red-200">
                Alert Trauma Team
            </button>
        </div>
    );
};

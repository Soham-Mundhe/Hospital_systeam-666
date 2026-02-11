import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { hospitalResources, clinicResources, labResources } from '../mockData';
import { ProgressBar } from '../components/ProgressBar';
import { Package, AlertCircle } from 'lucide-react';

export const Resources: FC = () => {
    const { user } = useAuth();

    if (!user) return null;

    const resources = user.facilityType === 'hospital' ? hospitalResources :
        user.facilityType === 'clinic' ? clinicResources : labResources;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {user.facilityType === 'hospital' ? 'Hospital Resources' :
                        user.facilityType === 'clinic' ? 'Pharmacy & Supplies' : 'Lab Equipment'}
                </h1>
                <p className="text-gray-500">Monitor inventory and equipment status.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((res, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{res.name}</h3>
                                <p className="text-sm text-gray-500">Unit: {res.unit}</p>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Package className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>

                        <div className="mt-2">
                            <ProgressBar
                                value={res.available}
                                max={res.total}
                                label="Availability"
                                colorClass={res.available / res.total < 0.2 ? "bg-red-500" : "bg-primary"}
                            />
                            {(res.available / res.total < 0.2) && (
                                <div className="mt-3 flex items-center text-xs text-red-600 font-medium">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    Low Stock Warning
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add New Resource Card (Placeholder) */}
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors cursor-pointer min-h-[160px]">
                    <Package className="w-8 h-8 mb-2" />
                    <span className="font-medium">Request Restock</span>
                </div>
            </div>
        </div>
    );
};

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, setDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useHospitalLiveData } from '../hooks/useHospitalLiveData';
import { clinicResources, labResources } from '../mockData';
import { 
    AlertCircle, Wifi, RefreshCw, 
    Plus, Bed, Activity, Wind, Droplet, 
    Boxes
} from 'lucide-react';
import { clsx } from 'clsx';
import { AddResourceModal } from '../components/AddResourceModal';

interface InventoryItem {
    id: string;
    name: string;
    total: number;
    available: number;
    unit: string;
    lowStockThreshold?: number;
}

export const Resources: FC = () => {
    const { user } = useAuth();
    const [resources, setResources] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const liveData = useHospitalLiveData(user?.facilityType === 'hospital' ? user.facilityId : '');

    useEffect(() => {
        if (!user?.facilityId || user.facilityType === 'hospital') return;

        const collectionRef = collection(db, 'facilities', user.facilityId, 'inventory');

        // 1. Initial Data check — if empty, populate with mocks for this facility type
        const checkAndPopulate = async () => {
            const snap = await getDocs(collectionRef);
            if (snap.empty) {
                const mocks = user.facilityType === 'clinic' ? clinicResources : labResources;

                await Promise.all(mocks.map(m =>
                    setDoc(doc(collectionRef, m.name.replace(/\s+/g, '_').toLowerCase()), {
                        ...m,
                        lowStockThreshold: Math.floor(m.total * 0.2)
                    })
                ));
            }
        };
        checkAndPopulate();

        // 2. Real-time listener
        const unsub = onSnapshot(collectionRef, (snap) => {
            const items = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as InventoryItem));
            setResources(items);
            setLastSync(new Date());
            setIsLoading(false);
        }, (err) => {
            console.error('[Resources] error:', err);
            setIsLoading(false);
        });

        return () => unsub();
    }, [user?.facilityId, user?.facilityType]);

    if (!user) return null;

    // Determine final data source
    const isHospital = user.facilityType === 'hospital';
    const finalIsLoading = isHospital ? !liveData.isLoaded : isLoading;
    const finalLastSync = isHospital ? liveData.lastSync : lastSync;

    let finalResources = resources;
    if (isHospital) {
        finalResources = [
            { id: 'beds', name: 'General Beds', total: liveData.totalBeds, available: liveData.totalBeds - liveData.occupiedBeds, unit: 'beds' },
            { id: 'icu', name: 'ICU Beds', total: liveData.icuBeds, available: liveData.icuBeds - liveData.icuOccupied, unit: 'beds' },
            { id: 'oxygen', name: 'Oxygen Cylinders', total: liveData.oxygenUnits, available: liveData.oxygenUnits, unit: 'units' }, // Assuming static capacity for now
            { id: 'ventilators', name: 'Ventilators', total: liveData.ventilators, available: liveData.ventilators, unit: 'units' },
        ];
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {user.facilityType === 'hospital' ? 'Hospital Resources' :
                            user.facilityType === 'clinic' ? 'Pharmacy & Supplies' : 'Lab Equipment'}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-gray-500 text-sm">Monitor inventory and equipment status.</p>
                        {finalLastSync && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <Wifi className="w-3 h-3" />
                                Live · {finalLastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 border border-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 shadow-blue-100"
                >
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {finalIsLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-48" />
                    ))
                ) : finalResources.length > 0 ? (
                    finalResources.map((res) => {
                        const ratio = res.total > 0 ? res.available / res.total : 0;
                        const isCritical = ratio < 0.2;
                        const isWarning = ratio < 0.5 && ratio >= 0.2;
                        
                        const getResourceConfig = (id: string) => {
                            const configs: Record<string, { icon: any, color: string }> = {
                                'beds': { icon: Bed, color: 'blue' },
                                'icu': { icon: Activity, color: 'purple' },
                                'oxygen': { icon: Droplet, color: 'cyan' },
                                'ventilators': { icon: Wind, color: 'indigo' },
                                'default': { icon: Boxes, color: 'slate' }
                            };
                            return configs[id] || configs.default;
                        };

                        const config = getResourceConfig(res.id);
                        const Icon = config.icon;

                        return (
                            <div key={res.id} className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                                {isCritical && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -mr-10 -mt-10" />}
                                
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110",
                                            isCritical ? "bg-red-50 border-red-100 text-red-500 shadow-red-100 shadow-lg" : 
                                            isWarning ? "bg-amber-50 border-amber-100 text-amber-500 shadow-amber-100 shadow-lg" : 
                                            "bg-emerald-50 border-emerald-100 text-emerald-500 shadow-emerald-100 shadow-lg"
                                        )}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg leading-tight">{res.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={clsx(
                                                    "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border italic",
                                                    isCritical ? "bg-red-50 text-red-600 border-red-100" :
                                                    isWarning ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                    "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                )}>
                                                    {isCritical ? 'Critical' : isWarning ? 'Warning' : 'Healthy'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 capitalize">Unit: {res.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-baseline justify-between">
                                        <div className="flex items-baseline gap-1">
                                            <span className={clsx(
                                                "text-4xl font-black tracking-tighter",
                                                isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                                            )}>{res.available}</span>
                                            <span className="text-sm font-black text-slate-300 italic">/ {res.total}</span>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Slots</p>
                                    </div>

                                    <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={clsx(
                                                "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out shadow-sm",
                                                isCritical ? "bg-gradient-to-r from-red-500 to-red-400" :
                                                isWarning ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                                                "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                            )} 
                                            style={{ width: `${ratio * 100}%` }}
                                        />
                                    </div>

                                    {isCritical && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100 animate-pulse">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                            <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter">Emergency Restock Required</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <Boxes className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-bold text-sm">No inventory data found for this facility.</p>
                    </div>
                )}

                {!finalIsLoading && (
                    <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/20 transition-all duration-300 cursor-pointer min-h-[220px] group relative overflow-hidden">
                        <div className="w-16 h-16 bg-slate-50 group-hover:bg-blue-100 rounded-[2rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 mb-4">
                            <RefreshCw className="w-8 h-8 group-hover:animate-spin-slow text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <div className="text-center">
                            <span className="font-black text-[10px] uppercase tracking-[0.2em] mb-1 block">Inventory Actions</span>
                            <span className="font-black text-sm text-slate-800">Request Bulk Restock</span>
                        </div>
                        <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1 uppercase tracking-widest">Click to proceed <Plus className="w-3 h-3"/></span>
                        </div>
                    </div>
                )}
            </div>

            {isAddModalOpen && user.facilityId && (
                <AddResourceModal 
                    facilityId={user.facilityId}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        // Real-time listener handles the update
                    }}
                />
            )}
        </div>
    );
};

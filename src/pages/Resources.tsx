import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, setDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { hospitalResources, clinicResources, labResources } from '../mockData';
import { ProgressBar } from '../components/ProgressBar';
import { Package, AlertCircle, Wifi, RefreshCw, Plus } from 'lucide-react';

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

    useEffect(() => {
        if (!user?.facilityId) return;

        const collectionRef = collection(db, 'facilities', user.facilityId, 'inventory');

        // 1. Initial Data check — if empty, populate with mocks for this facility type
        const checkAndPopulate = async () => {
            const snap = await getDocs(collectionRef);
            if (snap.empty) {
                const mocks = user.facilityType === 'hospital' ? hospitalResources :
                    user.facilityType === 'clinic' ? clinicResources : labResources;

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
                        {lastSync && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <Wifi className="w-3 h-3" />
                                Live · {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-95 transform">
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-pulse h-40" />
                    ))
                ) : resources.length > 0 ? (
                    resources.map((res) => {
                        const isLow = res.available / res.total < 0.2;
                        return (
                            <div key={res.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-lg">{res.name}</h3>
                                        <p className="text-sm text-gray-400 font-medium">Unit: {res.unit}</p>
                                    </div>
                                    <div className={isLow ? "bg-red-50 p-2.5 rounded-xl" : "bg-blue-50 p-2.5 rounded-xl"}>
                                        <Package className={isLow ? "w-5 h-5 text-red-600" : "w-5 h-5 text-blue-600"} />
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Availability</span>
                                        <span className={isLow ? "text-sm font-bold text-red-600" : "text-sm font-bold text-gray-700"}>
                                            {res.available} / {res.total}
                                        </span>
                                    </div>
                                    <ProgressBar
                                        value={res.available}
                                        max={res.total}
                                        colorClass={isLow ? "bg-red-500" : "bg-primary shadow-sm shadow-primary/20"}
                                    />
                                    {isLow && (
                                        <div className="mt-4 flex items-center p-2.5 bg-red-50 text-red-700 rounded-lg text-[11px] font-bold border border-red-100 uppercase tracking-tight">
                                            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                                            Low Stock Emergency Alert
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No inventory data found for this facility.</p>
                    </div>
                )}

                {/* Request Restock Card */}
                {!isLoading && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-all cursor-pointer min-h-[160px] group">
                        <div className="bg-gray-50 group-hover:bg-blue-50 p-4 rounded-full transition-colors mb-3">
                            <RefreshCw className="w-8 h-8 group-hover:rotate-180 transition-transform duration-500" />
                        </div>
                        <span className="font-bold text-sm tracking-wide">Request Restock</span>
                    </div>
                )}
            </div>
        </div>
    );
};

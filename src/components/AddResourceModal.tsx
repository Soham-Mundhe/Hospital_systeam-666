import { useState } from 'react';
import type { FC } from 'react';
import { X, Package, Loader2, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
    facilityId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddResourceModal: FC<Props> = ({ facilityId, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [total, setTotal] = useState('');
    const [available, setAvailable] = useState('');
    const [unit, setUnit] = useState('units');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !total) return;

        setIsSaving(true);
        try {
            const inventoryRef = collection(db, 'facilities', facilityId, 'inventory');
            await addDoc(inventoryRef, {
                name,
                total: parseInt(total),
                available: parseInt(available || total),
                unit,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error adding resource:', err);
            alert('Failed to add resource. Please check permissions.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                            <Plus className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">New Resource</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Register Inventory Item</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resource Name</label>
                        <input 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Oxygen Cylinders"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Total Stock</label>
                            <input 
                                required
                                type="number"
                                value={total}
                                onChange={(e) => setTotal(e.target.value)}
                                placeholder="100"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Available</label>
                            <input 
                                type="number"
                                value={available}
                                onChange={(e) => setAvailable(e.target.value)}
                                placeholder={total || "100"}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Unit Type</label>
                        <select 
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="units">Units</option>
                            <option value="beds">Beds</option>
                            <option value="liters">Liters</option>
                            <option value="vials">Vials / Strips</option>
                            <option value="kits">Medical Kits</option>
                        </select>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                            {isSaving ? 'Registering...' : 'Add to Inventory'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

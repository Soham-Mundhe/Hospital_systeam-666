import { useState } from 'react';
import type { FC } from 'react';
import type { Bed } from '../../types';
import { clsx } from 'clsx';
import { User, Bed as BedIcon, Sparkles, PenTool } from 'lucide-react';

interface BedGridProps {
    beds: Bed[];
    onBedClick?: (bed: Bed) => void;
    onBedCountChange?: (count: number, type: Bed['type']) => void;
}

export const BedGrid: FC<BedGridProps> = ({ beds, onBedClick, onBedCountChange }) => {
    const [selectedType, setSelectedType] = useState<Bed['type']>('general');

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BedIcon className="w-5 h-5 text-primary" />
                    Real-time Bed Status
                </h3>
                {onBedCountChange && (
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as Bed['type'])}
                            className="p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                            <option value="general">General</option>
                            <option value="icu">ICU</option>
                            <option value="pediatric">Pediatric</option>
                        </select>
                        <label htmlFor="bed-count" className="text-sm text-gray-500">Total:</label>
                        <input
                            type="number"
                            id="bed-count"
                            min="1"
                            max="200"
                            className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                            value={beds.length}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                    onBedCountChange(val, selectedType);
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {beds.map((bed) => (
                    <div
                        key={bed.id}
                        onClick={() => onBedClick && onBedClick(bed)}
                        className={clsx(
                            "p-4 rounded-lg border-2 flex flex-col items-center justify-center text-center transition-all duration-200 relative cursor-pointer",
                            "hover:shadow-lg hover:scale-105 active:scale-95",
                            bed.status === 'available' && "border-green-100 bg-green-50 hover:border-green-300",
                            bed.status === 'occupied' && "border-red-100 bg-red-50 hover:border-red-300",
                            bed.status === 'cleaning' && "border-yellow-100 bg-yellow-50 hover:border-yellow-300",
                            bed.status === 'maintenance' && "border-gray-200 bg-gray-100 opacity-75 hover:opacity-100"
                        )}
                    >
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">{bed.ward}</div>
                        <div className="text-xl font-bold text-gray-800 mb-2">{bed.number}</div>

                        {bed.status === 'occupied' && (
                            <div className="flex flex-col items-center gap-1">
                                <User className="w-6 h-6 text-red-400" />
                                <span className="text-xs font-medium text-red-700 truncate max-w-[100px]">{bed.patientName}</span>
                            </div>
                        )}

                        {bed.status === 'available' && (
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-6 h-6 rounded-full border-2 border-green-300 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                </div>
                                <span className="text-xs font-medium text-green-700">Available</span>
                            </div>
                        )}

                        {bed.status === 'cleaning' && (
                            <div className="flex flex-col items-center gap-1">
                                <Sparkles className="w-6 h-6 text-yellow-400" />
                                <span className="text-xs font-medium text-yellow-700">Cleaning</span>
                            </div>
                        )}

                        {bed.status === 'maintenance' && (
                            <div className="flex flex-col items-center gap-1">
                                <PenTool className="w-6 h-6 text-gray-400" />
                                <span className="text-xs font-medium text-gray-500">Maintenance</span>
                            </div>
                        )}

                        <div className={clsx(
                            "absolute top-2 right-2 w-2 h-2 rounded-full",
                            bed.type === 'icu' ? "bg-purple-500" : "bg-transparent"
                        )} title="ICU Bed" />
                    </div>
                ))}
            </div>

            <div className="mt-6 flex gap-4 text-xs text-gray-500 justify-center border-t border-gray-100 pt-4">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-200 rounded"></span> Available</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span> Occupied</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></span> Cleaning</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></span> Maint.</div>
            </div>
        </div>
    );
};

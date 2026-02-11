import type { FC } from 'react';
import { clsx } from 'clsx';

interface ProgressBarProps {
    value: number; // 0 to 100
    max?: number; // default 100
    label?: string;
    colorClass?: string;
    showValue?: boolean;
}

export const ProgressBar: FC<ProgressBarProps> = ({
    value,
    max = 100,
    label,
    colorClass = "bg-primary",
    showValue = true,
}) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-1">
                {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
                {showValue && <span className="text-sm font-medium text-gray-500">{value} / {max}</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={clsx("h-2.5 rounded-full", colorClass)}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

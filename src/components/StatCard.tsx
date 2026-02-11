import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { Stat } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatCardProps {
    stat: Stat;
    className?: string;
}

export const StatCard: FC<StatCardProps> = ({ stat, className }) => {
    // Dynamic icon rendering
    const IconComponent = (Icons as any)[stat.icon] as LucideIcon;

    return (
        <div className={twMerge("bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                    {IconComponent && <IconComponent className="h-6 w-6 text-primary" />}
                </div>
            </div>
            {stat.change && (
                <div className="mt-4 flex items-center">
                    <span
                        className={clsx(
                            "text-sm font-medium px-2 py-0.5 rounded",
                            stat.trend === 'up' && "text-green-700 bg-green-100",
                            stat.trend === 'down' && "text-red-700 bg-red-100",
                            stat.trend === 'neutral' && "text-gray-700 bg-gray-100"
                        )}
                    >
                        {stat.change}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">vs last week</span>
                </div>
            )}
        </div>
    );
};

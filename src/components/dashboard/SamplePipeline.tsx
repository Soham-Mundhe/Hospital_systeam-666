import type { FC } from 'react';
import type { PipelineStage } from '../../types';
import { clsx } from 'clsx';
import { FlaskConical, MoveRight, AlertTriangle, Clock, Timer, AlertCircle } from 'lucide-react';
import { useSimulation } from '../../hooks/useSimulation';

interface SamplePipelineProps {
    stages: PipelineStage[];
}

export const SamplePipeline: FC<SamplePipelineProps> = ({ stages }) => {
    const { labTurnaroundTime } = useSimulation();

    // Derived state for shortages (Simulated)
    const hasReagentShortage = labTurnaroundTime > 5.0;

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-indigo-600" />
                        Sample Processing Pipeline
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Real-time workflow tracking</p>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg TAT:</span>
                        <span className={clsx(
                            "text-sm font-bold",
                            labTurnaroundTime > 5 ? "text-red-600" : "text-gray-900"
                        )}>{labTurnaroundTime.toFixed(1)}h</span>
                    </div>

                    {hasReagentShortage && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            Reagent Low
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between relative px-4 md:px-12 py-4 overflow-x-auto min-w-[600px]">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full hidden md:block"></div>

                {stages.map((stage, idx) => (
                    <div key={stage.id} className="flex flex-col items-center relative z-10 group min-w-[100px]">
                        <div className={clsx(
                            "w-14 h-14 rounded-2xl flex items-center justify-center border-4 transition-all duration-500 relative",
                            stage.status === 'active' && "bg-white border-indigo-500 shadow-xl shadow-indigo-100 scale-110 rotate-3",
                            stage.status === 'bottleneck' && "bg-red-50 border-red-500 shadow-xl shadow-red-100 animate-pulse",
                            stage.status === 'idle' && "bg-gray-50 border-gray-200 text-gray-300"
                        )}>
                            {stage.status === 'bottleneck' ? (
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            ) : stage.status === 'idle' ? (
                                <Clock className="w-6 h-6 text-gray-300" />
                            ) : (
                                <span className="text-xl font-black text-indigo-600 tracking-tighter">{stage.count}</span>
                            )}

                            {/* Stage Step Indicator */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                Step {idx + 1}
                            </div>
                        </div>

                        <div className="mt-4 text-center">
                            <h4 className={clsx(
                                "font-bold text-gray-900",
                                stage.status === 'bottleneck' && "text-red-700"
                            )}>{stage.name}</h4>

                            <p className="text-xs text-gray-500 mt-1 max-w-[120px]">
                                {stage.status === 'bottleneck' ? 'Processing Delayed' : stage.status === 'active' ? 'On Track' : 'Waiting'}
                            </p>
                        </div>

                        {idx < stages.length - 1 && (
                            <div className="absolute top-1/2 -right-[50%] translate-x-1/2 -translate-y-1/2 text-gray-300 hidden md:block">
                                <MoveRight className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

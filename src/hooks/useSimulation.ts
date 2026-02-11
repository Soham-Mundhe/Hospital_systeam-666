import { useState, useEffect } from 'react';

// Simulation Configuration
const UPDATE_INTERVAL = 3000; // 3 seconds

interface SimulationState {
    queueLength: number;
    avgWaitTime: number; // in minutes
    bedOccupancy: number; // percentage
    icuOccupancy: number; // percentage
    oxygenLevel: number; // percentage
    labTurnaroundTime: number; // in hours
    emergencyActive: boolean;
}

const initialState: SimulationState = {
    queueLength: 4,
    avgWaitTime: 12,
    bedOccupancy: 78,
    icuOccupancy: 45,
    oxygenLevel: 92,
    labTurnaroundTime: 4.5,
    emergencyActive: false,
};

export const useSimulation = () => {
    const [state, setState] = useState<SimulationState>(initialState);

    useEffect(() => {
        const interval = setInterval(() => {
            setState(prev => {
                // Random fluctuations to simulate live data
                const newQueueLength = Math.max(0, prev.queueLength + (Math.random() > 0.6 ? 1 : Math.random() > 0.4 ? -1 : 0));

                // Wait time correlates with queue length but has noise
                const newWaitTime = Math.max(5, Math.floor(newQueueLength * 3.5 + (Math.random() * 5 - 2)));

                // Bed occupancy drifts slowly
                const newBedOccupancy = Math.min(100, Math.max(50, prev.bedOccupancy + (Math.random() * 4 - 2)));

                // ICU changes less frequently
                const newIcuOccupancy = Math.min(100, Math.max(20, prev.icuOccupancy + (Math.random() > 0.8 ? (Math.random() * 10 - 5) : 0)));

                // Oxygen fluctuates slightly
                const newOxygenLevel = Math.min(100, Math.max(80, prev.oxygenLevel + (Math.random() * 2 - 1)));

                // Lab TAT
                const newLabTAT = Math.max(1, prev.labTurnaroundTime + (Math.random() * 0.5 - 0.25));

                // Emergency override (rare event)
                const newEmergencyActive = Math.random() > 0.98 ? !prev.emergencyActive : prev.emergencyActive;

                return {
                    queueLength: newQueueLength,
                    avgWaitTime: newWaitTime,
                    bedOccupancy: Math.round(newBedOccupancy),
                    icuOccupancy: Math.round(newIcuOccupancy),
                    oxygenLevel: Math.round(newOxygenLevel),
                    labTurnaroundTime: parseFloat(newLabTAT.toFixed(1)),
                    emergencyActive: newEmergencyActive,
                };
            });
        }, UPDATE_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    return state;
};

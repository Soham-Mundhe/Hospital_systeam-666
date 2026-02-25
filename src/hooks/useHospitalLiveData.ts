/**
 * useHospitalLiveData
 *
 * Single hook that replaces both `useSimulation()` and the `hospitalStats`
 * mock array. Uses three Firestore onSnapshot listeners:
 *   1. facilities/{facilityId}/patients   → live patient counts
 *   2. facilities/{facilityId}/reports    → current 6-hour slot aggregates
 *   3. facilities/{facilityId}            → capacity config (totalBeds, icuBeds, oxygenUnits…)
 *
 * Returns values compatible with the existing dashboard template so that
 * the resource awareness panel and StatCards switch to live data with
 * minimal changes to Dashboard.tsx.
 */

import { useState, useEffect, useRef } from 'react';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientDoc {
    status?: string;
    icuRequired?: boolean;
    admissionDate?: string;
    diagnosis?: string;
}

interface ReportDoc {
    slotId?: string;
    occupiedBeds?: number;
    icuOccupied?: number;
    newAdmissions?: number;
    discharges?: number;
    emergencyCases?: number;
    fluCases?: number;
    dengueCases?: number;
    covidCases?: number;
}

interface FacilityConfig {
    totalBeds?: number;
    icuBeds?: number;
    emergencyCapacity?: number;
    oxygenUnits?: number;
    ventilators?: number;
}

export interface HospitalLiveData {
    // ── Resource awareness panel (replaces useSimulation) ──────────────────
    bedOccupancy: number;   // 0-100 %
    icuOccupancy: number;   // 0-100 %
    oxygenLevel: number;   // 0-100 % (units remaining vs total)
    emergencyActive: boolean;

    // ── StatCards (replaces hospitalStats) ─────────────────────────────────
    admissionsToday: number;
    bedOccupancyPct: string;   // "86%"
    icuOccupancyPct: string;   // "92%"
    oxygenDisplay: string;   // "450 units"

    // ── Raw numbers for downstream use ─────────────────────────────────────
    totalBeds: number;
    icuBeds: number;
    occupiedBeds: number;
    icuOccupied: number;
    oxygenUnits: number;
    emergencyCases: number;
    newAdmissions: number;
    discharges: number;

    // ── Sync indicator ─────────────────────────────────────────────────────
    lastSync: Date;
    isLoaded: boolean;
}

// ─── Slot helper ──────────────────────────────────────────────────────────────

function getCurrentSlotId(): string {
    const now = new Date();
    const h = now.getHours();  // LOCAL hours
    const slot = h < 6 ? '00' : h < 12 ? '06' : h < 18 ? '12' : '18';
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const dy = String(now.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}_${slot}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHospitalLiveData(facilityId: string): HospitalLiveData {
    const [patients, setPatients] = useState<PatientDoc[]>([]);
    const [report, setReport] = useState<ReportDoc>({});
    const [config, setConfig] = useState<FacilityConfig>({});
    const [lastSync, setLastSync] = useState<Date>(new Date());
    const [isLoaded, setIsLoaded] = useState(false);
    const unsubs = useRef<Array<() => void>>([]);

    useEffect(() => {
        if (!facilityId) return;

        // 1. Patients collection
        const pUnsub = onSnapshot(
            collection(db, 'facilities', facilityId, 'patients'),
            (snap) => {
                setPatients(snap.docs.map(d => d.data() as PatientDoc));
                setLastSync(new Date());
                setIsLoaded(true);
            },
            (err) => console.error('[LiveData] patients:', err)
        );

        // 2. Reports collection — pick the current slot reactively
        const rUnsub = onSnapshot(
            query(collection(db, 'facilities', facilityId, 'reports')),
            (snap) => {
                const curSlot = getCurrentSlotId();
                const curDoc = snap.docs.find(d => d.id === curSlot);
                setReport(curDoc ? (curDoc.data() as ReportDoc) : {});
                setLastSync(new Date());
            },
            (err) => console.error('[LiveData] reports:', err)
        );

        // 3. Facility config (totalBeds, icuBeds, oxygenUnits…)
        const fUnsub = onSnapshot(
            doc(db, 'facilities', facilityId),
            (snap) => {
                if (snap.exists()) setConfig(snap.data() as FacilityConfig);
                setLastSync(new Date());
            },
            (err) => console.error('[LiveData] facility:', err)
        );

        unsubs.current = [pUnsub, rUnsub, fUnsub];
        return () => unsubs.current.forEach(u => u());
    }, [facilityId]);

    // ── Computed metrics ──────────────────────────────────────────────────────

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Active patients counted directly from patient docs (source of truth)
    const activePatients = patients.filter(p => p.status === 'admitted' || p.status === 'critical').length;
    const icuOccupied = patients.filter(p => p.icuRequired === true).length;
    const admissionsToday = patients.filter(p => p.admissionDate === today).length;

    // Capacity values from Settings (facility doc)
    const totalBeds = config.totalBeds ?? 0;
    const icuBeds = config.icuBeds ?? 0;
    const oxygenUnits = config.oxygenUnits ?? 0;

    // Always use live patient count as source of truth.
    // report.occupiedBeds is a stale 6-hr aggregate — DO NOT use it for real-time display.
    const occupiedBeds = activePatients;

    // Percentages — safe-divide
    const bedOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const icuOccupancy = icuBeds > 0 ? Math.round((icuOccupied / icuBeds) * 100) : 0;
    // Oxygen level: treat oxygenUnits as current stock, 500 as reference max
    const oxygenRef = Math.max(oxygenUnits, 500);
    const oxygenLevel = oxygenRef > 0 ? Math.round((oxygenUnits / oxygenRef) * 100) : 0;

    const emergencyCases = report.emergencyCases ?? 0;
    const newAdmissions = report.newAdmissions ?? admissionsToday;
    const discharges = report.discharges ?? 0;

    const emergencyActive = emergencyCases > (config.emergencyCapacity ?? 20);

    return {
        // Resource awareness panel
        bedOccupancy,
        icuOccupancy,
        oxygenLevel,
        emergencyActive,

        // StatCards
        admissionsToday,
        bedOccupancyPct: `${bedOccupancy}%`,
        icuOccupancyPct: `${icuOccupancy}%`,
        oxygenDisplay: oxygenUnits > 0 ? `${oxygenUnits} units` : '—',

        // Raw values
        totalBeds,
        icuBeds,
        occupiedBeds,
        icuOccupied,
        oxygenUnits,
        emergencyCases,
        newAdmissions,
        discharges,

        lastSync,
        isLoaded,
    };
}

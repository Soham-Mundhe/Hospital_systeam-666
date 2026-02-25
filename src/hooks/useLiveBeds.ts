/**
 * useLiveBeds
 *
 * Derives a live Bed[] array from two Firestore onSnapshot listeners:
 *   1. facilities/{facilityId}/patients   → occupied beds
 *   2. facilities/{facilityId}            → totalBeds, icuBeds (capacity)
 *
 * Bed layout:
 *   - Each ADMITTED/CRITICAL patient gets an "occupied" bed card.
 *     - Their `ward` field is used as the bed number label (fallback: patient ID).
 *     - `icuRequired === true` → type:'icu', ward label "ICU"
 *     - otherwise → type:'general', ward label "General Ward A"
 *   - Remaining slots (totalBeds - generalOccupied) are shown as "available"
 *   - Remaining ICU slots (icuBeds - icuOccupied) are shown as "available"
 *
 * The returned Bed[] is fully compatible with BedGrid without changes.
 */

import { useState, useEffect, useRef } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Bed } from '../types';

export interface PatientDoc {
    id?: string;
    name?: string;
    age?: number;
    gender?: string;
    status?: string;
    ward?: string;
    admissionDate?: string;
    symptoms?: string[];
    diagnosis?: string;
    icuRequired?: boolean;
    oxygenRequired?: boolean;
    patientId?: string;
}

interface FacilityConfig {
    totalBeds?: number;
    icuBeds?: number;
}

export interface LiveBedsResult {
    beds: Bed[];
    livePatients: PatientDoc[];
    isLoaded: boolean;
}

export function useLiveBeds(facilityId: string): LiveBedsResult {
    const [patients, setPatients] = useState<PatientDoc[]>([]);
    const [config, setConfig] = useState<FacilityConfig>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const unsubs = useRef<Array<() => void>>([]);

    useEffect(() => {
        if (!facilityId) return;

        const pUnsub = onSnapshot(
            collection(db, 'facilities', facilityId, 'patients'),
            (snap) => {
                setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }) as PatientDoc));
                setIsLoaded(true);
            },
            (err) => console.error('[useLiveBeds] patients:', err)
        );

        const fUnsub = onSnapshot(
            doc(db, 'facilities', facilityId),
            (snap) => {
                if (snap.exists()) setConfig(snap.data() as FacilityConfig);
            },
            (err) => console.error('[useLiveBeds] facility:', err)
        );

        unsubs.current = [pUnsub, fUnsub];
        return () => unsubs.current.forEach(u => u());
    }, [facilityId]);

    // ── Build Bed[] from live data ─────────────────────────────────────────────

    const beds: Bed[] = [];

    const totalBeds = config.totalBeds ?? 0;
    const icuBeds = config.icuBeds ?? 0;

    // 1. Occupied general beds (admitted/critical patients, non-ICU)
    const generalPatients = patients.filter(
        p => (p.status === 'admitted' || p.status === 'critical') && !p.icuRequired
    );
    generalPatients.forEach((p, i) => {
        beds.push({
            id: `firestore-g-${p.id ?? i}`,
            ward: 'General Ward A',
            number: p.ward ?? `G-${i + 1}`,
            status: 'occupied',
            type: 'general',
            patientId: p.id,
            patientName: p.name,
        });
    });

    // 2. Available general beds (up to totalBeds capacity)
    const generalAvail = Math.max(0, totalBeds - icuBeds - generalPatients.length);
    for (let i = 0; i < generalAvail; i++) {
        beds.push({
            id: `avail-g-${i}`,
            ward: 'General Ward A',
            number: `G-${generalPatients.length + i + 1}`,
            status: 'available',
            type: 'general',
        });
    }

    // 3. Occupied ICU beds
    const icuPatients = patients.filter(
        p => (p.status === 'admitted' || p.status === 'critical') && p.icuRequired === true
    );
    icuPatients.forEach((p, i) => {
        beds.push({
            id: `firestore-icu-${p.id ?? i}`,
            ward: 'ICU',
            number: p.ward ?? `ICU-${i + 1}`,
            status: 'occupied',
            type: 'icu',
            patientId: p.id,
            patientName: p.name,
        });
    });

    // 4. Available ICU beds
    const icuAvail = Math.max(0, icuBeds - icuPatients.length);
    for (let i = 0; i < icuAvail; i++) {
        beds.push({
            id: `avail-icu-${i}`,
            ward: 'ICU',
            number: `ICU-${icuPatients.length + i + 1}`,
            status: 'available',
            type: 'icu',
        });
    }

    // 5. If no capacity configured yet, show discharged patients as a hint stub
    //    so the grid isn't completely empty for new users
    if (totalBeds === 0 && icuBeds === 0 && beds.length === 0) {
        beds.push({
            id: 'hint-1',
            ward: 'Set capacity in Settings',
            number: '—',
            status: 'available',
            type: 'general',
        });
    }

    return { beds, livePatients: patients, isLoaded };
}

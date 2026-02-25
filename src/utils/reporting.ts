/**
 * Automatic 6-Hour Interval Reporting Utility
 *
 * Pipeline: Patient Entry → 6-Hour Aggregation → Firestore → CSV Export → ML Training
 *
 * Slots:
 *   00:00–05:59 → "00"
 *   06:00–11:59 → "06"
 *   12:00–17:59 → "12"
 *   18:00–23:59 → "18"
 */

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Slot Helper ─────────────────────────────────────────────────────────────

/** Returns LOCAL date as YYYY-MM-DD (not UTC) */
function localDateStr(d: Date = new Date()): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
}

/** Returns the current 6-hour slot ID using LOCAL time.
 *  e.g. at 00:23 IST → "2026-02-26_00"
 *       at 07:15 IST → "2026-02-26_06"
 */
export function getCurrent6HourSlot(): string {
    const now = new Date();
    const hour = now.getHours();   // LOCAL hours
    const slot = hour < 6 ? '00' : hour < 12 ? '06' : hour < 18 ? '12' : '18';
    return `${localDateStr(now)}_${slot}`;
}

// ─── Patient document shape (subset used for aggregation) ────────────────────

interface PatientDoc {
    status?: string;
    icuRequired?: boolean;
    diagnosis?: string;
    admissionDate?: string; // YYYY-MM-DD
    createdAt?: { toDate?: () => Date } | Date | string | null;
}

// ─── Core Aggregation Function ───────────────────────────────────────────────

export async function update6HourReport(
    facilityId: string,
    admissionDate?: string   // optional: patient's admission date (YYYY-MM-DD)
): Promise<void> {
    if (!facilityId) return;

    const slotId = getCurrent6HourSlot();
    const todayStr = localDateStr();          // local date, not UTC

    try {
        // 1. Fetch all patients for this facility
        const patientsSnap = await getDocs(
            collection(db, 'facilities', facilityId, 'patients')
        );

        const patients: PatientDoc[] = patientsSnap.docs.map(
            (d) => d.data() as PatientDoc
        );

        // 2. Compute metrics
        const d = (diag: string) =>
            patients.filter(
                (p) =>
                    typeof p.diagnosis === 'string' &&
                    p.diagnosis.toLowerCase().includes(diag)
            ).length;

        const occupiedBeds = patients.filter((p) => p.status === 'admitted' || p.status === 'critical').length;
        const icuOccupied = patients.filter((p) => p.icuRequired === true).length;
        const fluCases = d('flu');
        const dengueCases = d('dengue');
        const covidCases = d('covid');

        // New admissions: patients whose admissionDate equals today
        const newAdmissions = patients.filter(
            (p) => p.admissionDate === todayStr
        ).length;

        // Discharges: patients with status === 'discharged' and discharged today
        // We approximate from admissionDate for display purposes;
        // a more precise check uses createdAt if admissionDate is today and status is discharged.
        const discharges = patients.filter((p) => {
            if (p.status !== 'discharged') return false;
            // Best-effort today check using admissionDate field
            return p.admissionDate === todayStr;
        }).length;

        // 3. Write the report document (merge: true allows re-runs to accumulate)
        const reportRef = doc(
            db,
            'facilities', facilityId,
            'reports', slotId
        );

        await setDoc(
            reportRef,
            {
                facilityId,
                slotId,
                timestamp: new Date().toISOString(),
                occupiedBeds,
                icuOccupied,
                fluCases,
                dengueCases,
                covidCases,
                newAdmissions,
                discharges,
                // CSV-compatible flat fields
                date: todayStr,
                slot: slotId.split('_')[1],
            },
            { merge: true }
        );

        console.info(`[6H Report] ${slotId} → saved for ${facilityId}`);

        // If the patient was admitted on a DIFFERENT date, also write a slot for that date
        if (admissionDate && admissionDate !== todayStr) {
            const pastSlotId = `${admissionDate}_18`;   // end-of-day slot for that date

            // Re-compute metrics scoped to that specific date
            const pastNewAdmissions = patients.filter((p) => p.admissionDate === admissionDate).length;
            const pastDischarges = patients.filter(
                (p) => p.status === 'discharged' && p.admissionDate === admissionDate
            ).length;
            const pastOccupied = patients.filter(
                (p) => (p.status === 'admitted' || p.status === 'critical') && p.admissionDate === admissionDate
            ).length;
            const pastIcu = patients.filter(
                (p) => p.icuRequired === true && p.admissionDate === admissionDate
            ).length;

            const pastReportRef = doc(db, 'facilities', facilityId, 'reports', pastSlotId);
            await setDoc(
                pastReportRef,
                {
                    facilityId,
                    slotId: pastSlotId,
                    timestamp: new Date().toISOString(),
                    occupiedBeds: pastOccupied,
                    icuOccupied: pastIcu,
                    fluCases: patients.filter((p) => p.admissionDate === admissionDate && typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('flu')).length,
                    dengueCases: patients.filter((p) => p.admissionDate === admissionDate && typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('dengue')).length,
                    covidCases: patients.filter((p) => p.admissionDate === admissionDate && typeof p.diagnosis === 'string' && p.diagnosis.toLowerCase().includes('covid')).length,
                    newAdmissions: pastNewAdmissions,
                    discharges: pastDischarges,
                    date: admissionDate,
                    slot: '18',
                },
                { merge: true }
            );
            console.info(`[6H Report] Past slot ${pastSlotId} → saved for ${facilityId}`);
        }
    } catch (err) {
        // Non-blocking: reporting must never break the patient save flow
        console.error('[6H Report] Failed to update report:', err);
    }
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

/**
 * Fetches ALL 6-hour report documents for a facility and exports them as CSV.
 * Refreshes the current slot first to ensure occupiedBeds reflects discharges.
 *
 * Column order (as specified):
 * slotId, fluCases, newAdmissions, occupiedBeds, avgTreatmentDays, icuBeds,
 * updatedAt, discharges, icuOccupied, emergencyCases, dengueCases, covidCases,
 * facilityId, date, totalBeds, slot, timestamp
 */
export async function exportCSV(facilityId: string): Promise<void> {
    if (!facilityId) return;

    // 1. Refresh current slot so discharged patients are counted correctly
    await update6HourReport(facilityId).catch(console.error);

    // 2. Fetch all report docs
    const snap = await getDocs(
        collection(db, 'facilities', facilityId, 'reports')
    );

    if (snap.empty) {
        alert('No reports available to export.');
        return;
    }

    // 3. Exact column order as requested
    const COLUMNS = [
        'slotId',
        'fluCases',
        'newAdmissions',
        'occupiedBeds',
        'avgTreatmentDays',
        'icuBeds',
        'updatedAt',
        'discharges',
        'icuOccupied',
        'emergencyCases',
        'dengueCases',
        'covidCases',
        'facilityId',
        'date',
        'totalBeds',
        'slot',
        'timestamp',
    ] as const;

    // 4. Build row objects (doc ID → slotId)
    const rows = snap.docs.map((d) => ({
        slotId: d.id,
        ...d.data(),
    }));

    // Sort by slotId ascending (oldest first)
    rows.sort((a, b) => String(a.slotId).localeCompare(String(b.slotId)));

    // 5. Escape helper
    const escape = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvLines: string[] = [
        COLUMNS.join(','),
        ...rows.map((row) =>
            COLUMNS.map((col) => escape((row as Record<string, unknown>)[col])).join(',')
        ),
    ];

    const csv = '\uFEFF' + csvLines.join('\n'); // BOM for Excel UTF-8

    // 6. Trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospital_${facilityId}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.info(`[CSV Export] ${rows.length} slot(s) exported for ${facilityId}`);
}



import { collection, doc, getDocs, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Slot Helper ─────────────────────────────────────────────────────────────

/** Returns LOCAL date as YYYY-MM-DD (not UTC) */
function localDateStr(d: Date = new Date()): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
}

/** Returns the current 6-hour slot ID using LOCAL time. */
export function getCurrent6HourSlot(): string {
    const now = new Date();
    const hour = now.getHours();   // LOCAL hours
    const slot = hour < 6 ? '00' : hour < 12 ? '06' : hour < 18 ? '12' : '18';
    return `${localDateStr(now)}_${slot}`;
}

// ─── Slot conversion helpers (used by backfill) ──────────────────────────────

export function slotIdToDate(slotId: string): Date {
    const [datePart, hourPart] = slotId.split('_');
    return new Date(`${datePart}T${hourPart}:00:00`);
}

export function dateToSlotId(d: Date): string {
    const h = d.getHours();
    const slot = h < 6 ? '00' : h < 12 ? '06' : h < 18 ? '12' : '18';
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}_${slot}`;
}

// ─── Report document shape ───────────────────────────────────────────────────

interface ReportData {
    slotId?: string;
    timestamp?: any;
    facilityId?: string;
    occupiedBeds?: number;
    icuOccupied?: number;
    fluCases?: number;
    dengueCases?: number;
    covidCases?: number;
    emergencyCases?: number;
    newAdmissionsToday?: number;
    dischargesToday?: number;
    totalBeds?: number;
    icuBeds?: number;
    availableBeds?: number;
    bedUtilization?: number;
    icuStressIndex?: number;
    riskScore?: number;
    date?: string;
    slot?: string;
    [key: string]: unknown;
}

interface PatientDoc {
    status?: string;
    icuRequired?: boolean;
    diagnosis?: string;
    admissionDate?: string;
    dischargeDate?: string;
}

// ─── Core Aggregation & Backfill Logic ────────────────────────────────────────

export async function update6HourReport(facilityId: string): Promise<void> {
    if (!facilityId) return;

    const currentSlotId = getCurrent6HourSlot();
    const [todayStr, currentSlotHour] = currentSlotId.split('_');

    try {
        // 1. BACKFILL SYSTEM
        const reportsSnap = await getDocs(collection(db, 'facilities', facilityId, 'reports'));
        if (!reportsSnap.empty) {
            const sortedDocs = reportsSnap.docs
                .map(d => ({ id: d.id, data: d.data() as ReportData }))
                .sort((a, b) => a.id.localeCompare(b.id));

            const lastReport = sortedDocs[sortedDocs.length - 1];
            let lastSlotDate = slotIdToDate(lastReport.id);
            const currentSlotDate = slotIdToDate(currentSlotId);

            const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

            // Loop through missing slots
            while (lastSlotDate.getTime() + SIX_HOURS_MS < currentSlotDate.getTime()) {
                lastSlotDate = new Date(lastSlotDate.getTime() + SIX_HOURS_MS);
                const missingSlotId = dateToSlotId(lastSlotDate);

                console.info('[Backfill] Copying data to missing slot:', missingSlotId);

                // Copy full report data from last existing slot
                const [mDate, mSlot] = missingSlotId.split('_');
                const backfillPayload = {
                    ...lastReport.data,
                    slotId: missingSlotId,
                    date: mDate,
                    slot: mSlot,
                    timestamp: serverTimestamp(),
                };

                await setDoc(doc(db, 'facilities', facilityId, 'reports', missingSlotId), backfillPayload, { merge: true });
            }
        }

        // 2. RECALCULATE ALL METRICS FRESH FROM PATIENTS COLLECTION
        const patientsSnap = await getDocs(collection(db, 'facilities', facilityId, 'patients'));
        const patients: PatientDoc[] = patientsSnap.docs.map(d => d.data() as PatientDoc);

        // Fetch Facility capacity
        const facilitySnap = await getDoc(doc(db, 'facilities', facilityId));
        const facilityData = facilitySnap.exists() ? facilitySnap.data() : {};
        const totalBeds = Number(facilityData.totalBeds) || 0;
        const icuBeds = Number(facilityData.icuBeds) || 0;

        // Computation
        const admittedPatients = patients.filter(p => p.status === 'admitted' || p.status === 'critical');
        const occupiedBeds = admittedPatients.length;
        const icuOccupied = admittedPatients.filter(p => p.icuRequired).length;

        const d = (diag: string) => admittedPatients.filter(p => p.diagnosis?.toLowerCase() === diag).length;

        const fluCases = d('flu');
        const dengueCases = d('dengue');
        const covidCases = d('covid');
        const emergencyCases = patients.filter(p => p.status === 'critical').length;

        const newAdmissionsToday = patients.filter(p => p.admissionDate === todayStr).length;
        const dischargesToday = patients.filter(p => p.status === 'discharged' && p.dischargeDate === todayStr).length;

        // Derived
        const availableBeds = Math.max(0, totalBeds - occupiedBeds);
        const bedUtilization = totalBeds > 0 ? occupiedBeds / totalBeds : 0;
        const icuStressIndex = icuBeds > 0 ? icuOccupied / icuBeds : 0;
        const riskScore = (icuStressIndex * 0.5) + (bedUtilization * 0.5);

        // 3. SAVE CURRENT SLOT
        const reportRef = doc(db, 'facilities', facilityId, 'reports', currentSlotId);
        await setDoc(reportRef, {
            facilityId,
            slotId: currentSlotId,
            timestamp: serverTimestamp(),
            date: todayStr,
            slot: currentSlotHour,
            occupiedBeds,
            icuOccupied,
            fluCases,
            dengueCases,
            covidCases,
            emergencyCases,
            newAdmissionsToday,
            dischargesToday,
            totalBeds,
            icuBeds,
            availableBeds,
            bedUtilization,
            icuStressIndex,
            riskScore
        }, { merge: true });

        console.info(`[6H Report] ${currentSlotId} recalculated and saved.`);
    } catch (err) {
        console.error('[6H Report] Failed:', err);
    }
}

/**
 * Generates (or updates) a report for a specific slot ID.
 */
export async function generateScheduledReport(
    facilityId: string,
    slotId: string
): Promise<void> {
    if (!facilityId) return;
    // Always trigger update6HourReport which includes backfill and current recalculation
    await update6HourReport(facilityId);
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export async function exportCSV(facilityId: string): Promise<void> {
    if (!facilityId) return;

    // Ensure all slots exist before export
    await update6HourReport(facilityId).catch(console.error);

    const snap = await getDocs(collection(db, 'facilities', facilityId, 'reports'));
    if (snap.empty) {
        alert('No reports available to export.');
        return;
    }

    const COLUMNS = [
        'slotId', 'fluCases', 'newAdmissionsToday', 'occupiedBeds',
        'icuBeds', 'dischargesToday', 'icuOccupied', 'emergencyCases',
        'dengueCases', 'covidCases', 'facilityId', 'date', 'totalBeds', 'slot',
        'timestamp', 'bedUtilization', 'icuStressIndex', 'riskScore'
    ] as const;

    const rows = snap.docs.map(d => ({ slotId: d.id, ...d.data() }));
    rows.sort((a, b) => String(a.slotId).localeCompare(String(b.slotId)));

    const escape = (val: unknown) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        return (str.includes(',') || str.includes('"') || str.includes('\n')) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvLines = [
        COLUMNS.join(','),
        ...rows.map(row => COLUMNS.map(col => escape((row as any)[col])).join(','))
    ];

    downloadFile(csvLines.join('\n'), `hospital_${facilityId}_reports_${new Date().toISOString().slice(0, 10)}.csv`);
}

/** ML-Ready CSV Export */
export async function exportMLCSV(facilityId: string): Promise<void> {
    if (!facilityId) return;

    await update6HourReport(facilityId).catch(console.error);

    const snap = await getDocs(collection(db, 'facilities', facilityId, 'reports'));
    if (snap.empty) {
        alert('No data for ML export.');
        return;
    }

    const FEATURE_COLUMNS = [
        'hourSlot', 'dayOfWeek', 'occupiedBeds', 'icuOccupied', 'fluCases',
        'dengueCases', 'covidCases', 'emergencyCases', 'newAdmissionsToday', 'dischargesToday',
        'totalBeds', 'icuBeds', 'bedUtilization', 'icuStressIndex', 'riskScore'
    ];

    const rowsWithId = snap.docs.map(d => ({ id: d.id, data: d.data() as ReportData }));
    rowsWithId.sort((a, b) => a.id.localeCompare(b.id));

    const finalRows = rowsWithId.map(item => {
        const data = item.data;
        const [datePart, hourPart] = item.id.split('_');
        const dateObj = new Date(datePart);

        return [
            parseInt(hourPart, 10) || 0,
            dateObj.getDay(),
            data.occupiedBeds || 0,
            data.icuOccupied || 0,
            data.fluCases || 0,
            data.dengueCases || 0,
            data.covidCases || 0,
            data.emergencyCases || 0,
            data.newAdmissionsToday || 0,
            data.dischargesToday || 0,
            data.totalBeds || 0,
            data.icuBeds || 0,
            (data.bedUtilization || 0).toFixed(4),
            (data.icuStressIndex || 0).toFixed(4),
            (data.riskScore || 0).toFixed(4)
        ].join(',');
    });

    const csvContent = [FEATURE_COLUMNS.join(','), ...finalRows].join('\n');
    downloadFile(csvContent, `hospital_${facilityId}_ML_${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Helper for downloading */
function downloadFile(content: string, filename: string) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function backfillMissingSlots(facilityId: string): Promise<void> {
    // This is now integrated into update6HourReport
    await update6HourReport(facilityId);
}

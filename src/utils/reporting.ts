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
 *
 * Scheduled reports: generateScheduledReport() is called by useScheduledReporting hook
 * at each slot boundary regardless of patient activity, ensuring continuous time-series data.
 */

import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
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

// ─── Slot conversion helpers (used by backfill) ──────────────────────────────

/**
 * Converts a slotId string like "2026-02-26_18" into a Date object
 * representing the LOCAL start time of that slot.
 *
 * IMPORTANT: Uses `new Date(datePart + "T" + hourPart + ":00:00")` which
 * creates a LOCAL-timezone Date, matching how getHours() produces slotIds.
 */
export function slotIdToDate(slotId: string): Date {
    const [datePart, hourPart] = slotId.split('_');
    return new Date(`${datePart}T${hourPart}:00:00`);
}

/**
 * Converts a Date object into a slotId string "YYYY-MM-DD_HH"
 * using LOCAL time — same logic as getCurrent6HourSlot().
 */
export function dateToSlotId(d: Date): string {
    const h = d.getHours();
    const slot = h < 6 ? '00' : h < 12 ? '06' : h < 18 ? '12' : '18';
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}_${slot}`;
}

// ─── Report document shape (used for backfill copying) ───────────────────────

interface ReportData {
    slotId?: string;
    timestamp?: string;
    autoFilled?: boolean;
    scheduledRun?: boolean;
    facilityId?: string;
    occupiedBeds?: number;
    icuOccupied?: number;
    fluCases?: number;
    dengueCases?: number;
    covidCases?: number;
    emergencyCases?: number;
    newAdmissions?: number;
    discharges?: number;
    totalBeds?: number;
    icuBeds?: number;
    availableBeds?: number;
    bedUtilization?: number;
    icuStressIndex?: number;
    fluGrowthRate?: number;
    riskScore?: number;
    overCapacity?: boolean;
    icuCritical?: boolean;
    diseaseSpike?: boolean;
    date?: string;
    slot?: string;
    [key: string]: unknown;
}

// ─── Backfill: fill gaps in the 6-hour time-series ──────────────────────────

/**
 * STEP-BY-STEP BACKFILL ALGORITHM
 *
 * Run once on dashboard load. Guarantees every 6-hour slot between the
 * oldest existing report and NOW is present in Firestore.
 */
export async function backfillMissingSlots(facilityId: string): Promise<void> {
    if (!facilityId) return;

    console.info('[Backfill] Starting backfill check for', facilityId);

    const currentSlotId = getCurrent6HourSlot();
    const currentSlotDate = slotIdToDate(currentSlotId);

    try {
        const reportsSnap = await getDocs(
            collection(db, 'facilities', facilityId, 'reports')
        );

        if (reportsSnap.empty) {
            console.info('[Backfill] No existing reports — generating current slot:', currentSlotId);
            await generateScheduledReport(facilityId, currentSlotId);
            return;
        }

        const sortedDocs = reportsSnap.docs
            .slice()
            .sort((a, b) => a.id.localeCompare(b.id));

        const existingSlotIds = new Set(sortedDocs.map(d => d.id));
        const lastDoc = sortedDocs[sortedDocs.length - 1];
        const lastSlotId = lastDoc.id;
        let lastSlotDate = slotIdToDate(lastSlotId);
        let lastKnownData = lastDoc.data() as ReportData;

        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

        while (lastSlotDate.getTime() + SIX_HOURS_MS < currentSlotDate.getTime()) {
            lastSlotDate = new Date(lastSlotDate.getTime() + SIX_HOURS_MS);
            const missingSlotId = dateToSlotId(lastSlotDate);

            if (existingSlotIds.has(missingSlotId)) {
                const docRef = sortedDocs.find(d => d.id === missingSlotId);
                if (docRef) lastKnownData = docRef.data() as ReportData;
                continue;
            }

            console.info('[Backfill] Creating autoFilled slot:', missingSlotId);

            const {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                timestamp: _ts,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                slotId: _sid,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                autoFilled: _af,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                scheduledRun: _sr,
                ...copiedFields
            } = lastKnownData;

            const [datePart, slotHour] = missingSlotId.split('_');

            const backfillPayload: ReportData = {
                ...copiedFields,
                facilityId,
                slotId: missingSlotId,
                date: datePart,
                slot: slotHour,
                autoFilled: true,
                scheduledRun: false,
                timestamp: lastSlotDate.toISOString(),
            };

            const backfillRef = doc(db, 'facilities', facilityId, 'reports', missingSlotId);
            await setDoc(backfillRef, backfillPayload, { merge: false });

            lastKnownData = backfillPayload;
            existingSlotIds.add(missingSlotId);
        }

        if (!existingSlotIds.has(currentSlotId)) {
            await generateScheduledReport(facilityId, currentSlotId);
        }

        console.info('[Backfill] ✓ Backfill complete for', facilityId);
    } catch (err) {
        console.error('[Backfill] Error during backfill:', err);
    }
}

// ─── Patient document shape (subset used for aggregation) ────────────────────

interface PatientDoc {
    status?: string;
    icuRequired?: boolean;
    diagnosis?: string;
    admissionDate?: string; // YYYY-MM-DD
    dischargeDate?: string; // YYYY-MM-DD
    createdAt?: { toDate?: () => Date } | Date | string | null;
}

// ─── Core Aggregation Function ───────────────────────────────────────────────

export async function update6HourReport(
    facilityId: string,
    targetDateStr?: string   // optional: specific date for historical recalculation
): Promise<void> {
    if (!facilityId) return;

    const slotId = getCurrent6HourSlot();
    const [todayStr, slotHour] = slotId.split('_');
    const targetSlotDateStr = targetDateStr || todayStr;
    const currentSlotId = targetDateStr ? `${targetDateStr}_${slotHour}` : slotId;
    const slotTimestamp = slotIdToDate(currentSlotId);

    try {
        // 1. Fetch all patients 
        const patientsSnap = await getDocs(
            collection(db, 'facilities', facilityId, 'patients')
        );
        const patients: PatientDoc[] = patientsSnap.docs.map(d => d.data() as PatientDoc);

        // 2. Fetch Facility capacity
        const facilitySnap = await getDoc(doc(db, 'facilities', facilityId));
        const facilityData = facilitySnap.exists() ? facilitySnap.data() : {};
        const totalBeds = Number(facilityData.totalBeds) || 0;
        const icuBeds = Number(facilityData.icuBeds) || 0;
        const emergencyCapacity = Number(facilityData.emergencyCapacity) || 10; // Default fallback

        // 3. Time-Aware Filter: Patient is active in this slot if:
        // admissionDate <= slotTimestamp AND (no dischargeDate OR dischargeDate > slotTimestamp)
        const getActiveAtSlot = (dateThreshold: Date) => patients.filter(p => {
            if (!p.admissionDate) return false;
            const adm = new Date(`${p.admissionDate}T00:00:00`);
            const isActive = adm <= dateThreshold;

            if (!isActive) return false;

            if (!p.dischargeDate || p.status !== 'discharged') return true;
            const dis = new Date(`${p.dischargeDate}T23:59:59`); // End of day for safety
            return dis > dateThreshold;
        });

        const activePatients = getActiveAtSlot(slotTimestamp);

        // 4. Compute Metrics
        const occupiedBeds = activePatients.length;
        const icuOccupied = activePatients.filter(p => p.icuRequired).length;

        const d = (diag: string) => activePatients.filter(p =>
            p.diagnosis?.toLowerCase() === diag
        ).length;

        const fluCases = d('flu');
        const dengueCases = d('dengue');
        const covidCases = d('covid');
        const emergencyCases = activePatients.filter(p => p.status === 'critical').length;

        const newAdmissions = patients.filter(p => p.admissionDate === targetSlotDateStr).length;
        const discharges = patients.filter(p => p.status === 'discharged' && p.dischargeDate === targetSlotDateStr).length;

        // 5. Derived Metrics & ML Engineering
        const availableBeds = Math.max(0, totalBeds - occupiedBeds);
        const bedUtilization = totalBeds > 0 ? occupiedBeds / totalBeds : 0;
        const icuStressIndex = icuBeds > 0 ? icuOccupied / icuBeds : 0;
        const normalizedEmergency = emergencyCases / emergencyCapacity;

        // 6. Growth Rate Logic (Fetch previous slot)
        // Find slot -6h
        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
        const prevSlotTimestamp = new Date(slotTimestamp.getTime() - SIX_HOURS_MS);
        const prevSlotId = dateToSlotId(prevSlotTimestamp);
        const prevSnap = await getDoc(doc(db, 'facilities', facilityId, 'reports', prevSlotId));
        const prevData = prevSnap.exists() ? prevSnap.data() as ReportData : null;

        let fluGrowthRate = 0;
        if (prevData && prevData.fluCases && prevData.fluCases > 0) {
            fluGrowthRate = (fluCases - prevData.fluCases) / prevData.fluCases;
        }

        // 7. Risk Score & Alerts
        const riskScore = (icuStressIndex * 0.4) + (bedUtilization * 0.3) + (Math.min(1, normalizedEmergency) * 0.3);

        const overCapacity = bedUtilization > 0.85;
        const icuCritical = icuStressIndex > 0.9;
        const diseaseSpike = fluGrowthRate > 0.4;

        // 8. Write to Firestore
        const reportRef = doc(db, 'facilities', facilityId, 'reports', currentSlotId);
        await setDoc(reportRef, {
            facilityId,
            slotId: currentSlotId,
            timestamp: new Date().toISOString(),
            date: targetSlotDateStr,
            slot: currentSlotId.split('_')[1],
            // Raw
            occupiedBeds,
            icuOccupied,
            fluCases,
            dengueCases,
            covidCases,
            emergencyCases,
            newAdmissions,
            discharges,
            totalBeds,
            icuBeds,
            // Derived
            availableBeds,
            bedUtilization,
            icuStressIndex,
            fluGrowthRate,
            riskScore,
            // Alerts
            overCapacity,
            icuCritical,
            diseaseSpike
        }, { merge: true });

        console.info(`[6H Report] ${currentSlotId} optimized aggregation saved.`);
    } catch (err) {
        console.error('[6H Report] Failed:', err);
    }
}

// ─── Scheduled Report (explicit slotId) ─────────────────────────────────────

/**
 * Generates (or updates) a report for a specific slot ID.
 * Called by useScheduledReporting at each 6-hour boundary.
 */
export async function generateScheduledReport(
    facilityId: string,
    slotId: string
): Promise<void> {
    if (!facilityId || !slotId) return;

    // We can now just reuse update6HourReport logic by passing the date from the slotId
    const dateStr = slotId.split('_')[0];
    await update6HourReport(facilityId, dateStr);

    // Additionally mark it as a scheduled run if needed (though update6HourReport handles the bulk)
    const reportRef = doc(db, 'facilities', facilityId, 'reports', slotId);
    await setDoc(reportRef, { scheduledRun: true }, { merge: true });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

/** Standard CSV Export */
export async function exportCSV(facilityId: string): Promise<void> {
    if (!facilityId) return;

    await update6HourReport(facilityId).catch(console.error);

    const snap = await getDocs(collection(db, 'facilities', facilityId, 'reports'));
    if (snap.empty) {
        alert('No reports available to export.');
        return;
    }

    const COLUMNS = [
        'slotId', 'fluCases', 'newAdmissions', 'occupiedBeds', 'avgTreatmentDays',
        'icuBeds', 'updatedAt', 'discharges', 'icuOccupied', 'emergencyCases',
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

    downloadFile(csvLines.join('\n'), `hospital_${facilityId}_raw_${new Date().toISOString().slice(0, 10)}.csv`);
}

/** ML-Ready CSV Export: Clean, Numeric-Only dataset */
export async function exportMLCSV(facilityId: string): Promise<void> {
    if (!facilityId) return;

    const snap = await getDocs(collection(db, 'facilities', facilityId, 'reports'));
    if (snap.empty) {
        alert('No data for ML export.');
        return;
    }

    // Engineering Features
    const FEATURE_COLUMNS = [
        'hourSlot', 'dayOfWeek', 'occupiedBeds', 'icuOccupied', 'fluCases',
        'dengueCases', 'covidCases', 'emergencyCases', 'newAdmissions', 'discharges',
        'totalBeds', 'icuBeds', 'bedUtilization', 'icuStressIndex', 'fluGrowthRate', 'riskScore'
    ];

    // We need slotId for sorting ML data chronologically
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
            data.newAdmissions || 0,
            data.discharges || 0,
            data.totalBeds || 0,
            data.icuBeds || 0,
            (data.bedUtilization || 0).toFixed(4),
            (data.icuStressIndex || 0).toFixed(4),
            (data.fluGrowthRate || 0).toFixed(4),
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



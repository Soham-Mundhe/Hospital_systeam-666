/**
 * useScheduledReporting
 *
 * Background scheduler hook that ensures a 6-hour report is written to Firestore
 * at every slot boundary, even with zero patient activity.
 *
 * Slot boundaries (local time):
 *   00:00 → slot "00"
 *   06:00 → slot "06"
 *   12:00 → slot "12"
 *   18:00 → slot "18"
 *
 * Behaviour:
 *   1. On mount → immediately writes a report for the CURRENT slot (backfill).
 *   2. Sets a timeout for the NEXT slot boundary.
 *   3. When that fires → writes a report for the NEW slot, then reschedules again.
 *   4. On unmount → clears any pending timeout cleanly.
 *
 * This guarantees continuous time-series data in:
 *   facilities/{facilityId}/reports/{YYYY-MM-DD_HH}
 */

import { useEffect, useRef } from 'react';
import { generateScheduledReport } from '../utils/reporting';

// ─── Slot helpers ─────────────────────────────────────────────────────────────

/** Format a Date as "YYYY-MM-DD" using LOCAL time. */
function localDateStr(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
}

/**
 * Return the slotId for a given Date using LOCAL time.
 * E.g. 07:45 local → "2026-02-26_06"
 */
function slotIdFor(d: Date): string {
    const h = d.getHours();
    const slot = h < 6 ? '00' : h < 12 ? '06' : h < 18 ? '12' : '18';
    return `${localDateStr(d)}_${slot}`;
}

/**
 * Returns the Date object for the NEXT slot boundary after `now`.
 *
 * Slot starts: 0, 6, 12, 18 (hours)
 * Next slot = (Math.floor(currentHour / 6) + 1) * 6
 * If that's 24, it rolls over to 00:00 the next day.
 */
function nextSlotBoundary(now: Date): Date {
    const nextHour = (Math.floor(now.getHours() / 6) + 1) * 6;

    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    if (nextHour >= 24) {
        // Roll to next calendar day at 00:00
        next.setDate(next.getDate() + 1);
        next.setHours(0);
        next.setMinutes(0);
    } else {
        next.setHours(nextHour);
        next.setMinutes(0);
    }

    return next;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useScheduledReporting(facilityId: string): void {
    // Keep the timeout ID in a ref so cleanup works even after re-renders
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track whether the hook is still mounted
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        if (!facilityId) return;

        /**
         * Core scheduler function.
         * Writes a report for `targetSlotId`, then schedules the next run.
         */
        async function runAndScheduleNext(targetSlotId: string): Promise<void> {
            if (!mountedRef.current) return;

            console.info(`[Scheduler] Running report for slot: ${targetSlotId}`);
            await generateScheduledReport(facilityId, targetSlotId);

            if (!mountedRef.current) return;

            // Calculate delay to the next slot boundary
            const now = new Date();
            const next = nextSlotBoundary(now);
            const delayMs = next.getTime() - now.getTime();

            console.info(
                `[Scheduler] Next run at ${next.toLocaleTimeString()} (slot: ${slotIdFor(next)}) — in ${Math.round(delayMs / 1000)}s`
            );

            timeoutRef.current = setTimeout(() => {
                const newSlotId = slotIdFor(new Date());
                runAndScheduleNext(newSlotId);
            }, delayMs);
        }

        // ── 1. Immediate backfill for the current slot ─────────────────────
        const currentSlotId = slotIdFor(new Date());
        console.info(`[Scheduler] Mounted — immediate backfill for slot: ${currentSlotId}`);
        runAndScheduleNext(currentSlotId);

        return () => {
            mountedRef.current = false;
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [facilityId]);
}

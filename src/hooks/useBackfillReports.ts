/**
 * useBackfillReports
 *
 * Runs the 7-step backfill algorithm ONCE on dashboard load.
 * Ensures no 6-hour slot is ever missing in Firestore, filling any
 * gaps between the last existing report and the current slot.
 *
 * Lifecycle:
 *   - Fires immediately when facilityId becomes available (effect runs once).
 *   - Uses a ref guard so it never runs more than once per session.
 *   - Completely non-blocking — errors are logged, never thrown.
 *
 * Usage:
 *   // In Dashboard.tsx (hospital section):
 *   useBackfillReports(user.facilityId);
 */

import { useEffect, useRef } from 'react';
import { backfillMissingSlots } from '../utils/reporting';

export function useBackfillReports(facilityId: string): void {
    // Guard: only run once per facilityId per session
    const hasRunRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!facilityId) return;

        // Already ran for this facilityId — skip
        if (hasRunRef.current.has(facilityId)) return;
        hasRunRef.current.add(facilityId);

        console.info('[useBackfillReports] Starting backfill for', facilityId);

        // Fire-and-forget — never awaited at the hook level so it doesn't block render
        backfillMissingSlots(facilityId).catch((err) => {
            console.error('[useBackfillReports] Uncaught error:', err);
        });
    }, [facilityId]);
}

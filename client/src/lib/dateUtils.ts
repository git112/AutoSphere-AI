/**
 * dateUtils.ts — IST (Asia/Kolkata, UTC+05:30) display helpers
 *
 * All functions operate purely at the presentation layer.
 * UTC values stored in the database are converted to IST only for display.
 * No backend logic is modified.
 */

const IST_TZ = 'Asia/Kolkata';

/**
 * Returns today's date string in YYYY-MM-DD format using IST.
 * Used as the default/minimum date in the Schedule Post modal.
 */
export function todayIST(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: IST_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/**
 * Returns the current IST time string as HH:MM (24-hour).
 * Used as the minimum selectable time in the Schedule Post modal.
 */
export function nowTimeIST(): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: IST_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date());
}

/**
 * Returns the next full hour in IST as HH:MM (24-hour).
 * Used as the default time pre-filled in the Schedule Post modal.
 */
export function nextHourIST(): string {
    // Get current IST hour and advance by 1
    const nowInIST = new Date(
        new Date().toLocaleString('en-US', { timeZone: IST_TZ })
    );
    nowInIST.setHours(nowInIST.getHours() + 1, 0, 0, 0);
    const h = String(nowInIST.getHours()).padStart(2, '0');
    const m = '00';
    return `${h}:${m}`;
}

/**
 * Formats a Date object as "HH:MM · Mon DD" in IST.
 * Used in the Content page history list.
 */
export function formatTimeIST(d: Date): string {
    const time = new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(d);

    const date = new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TZ,
        month: 'short',
        day: 'numeric',
    }).format(d);

    return `${time} · ${date}`;
}

/**
 * Formats an ISO 8601 string as { date, time } in IST.
 * date: "Mon, DD Mmm YYYY"
 * time: "HH:MM AM/PM IST"
 * Used in the Scheduler page's Scheduled Posts card grid.
 */
export function formatScheduledIST(iso: string): { date: string; time: string } {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TZ,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(d);

    const time =
        new Intl.DateTimeFormat('en-IN', {
            timeZone: IST_TZ,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).format(d) + ' IST';

    return { date, time };
}

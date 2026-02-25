export type TimeRange = {
    start: string;
    end: string;
    startMin: number;
    endMin: number;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTimeToMinutes(value?: string | null) {
    if (!value) return null;
    const match = TIME_RE.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
}

export function normalizeTimeRange(start?: string | null, end?: string | null): TimeRange | null {
    if (!start && !end) return null;
    const startMin = parseTimeToMinutes(start);
    const endMin = parseTimeToMinutes(end);
    if (startMin === null || endMin === null) return null;
    if (endMin <= startMin) return null;
    return {
        start: start ?? "",
        end: end ?? "",
        startMin,
        endMin,
    };
}

export function rangesOverlap(a: TimeRange, b: TimeRange) {
    return a.startMin < b.endMin && a.endMin > b.startMin;
}

export function rangeWithinSlot(
    range: TimeRange,
    slotStart?: string | null,
    slotEnd?: string | null,
) {
    const slotRange = normalizeTimeRange(slotStart, slotEnd);
    if (!slotRange) return false;
    return slotRange.startMin <= range.startMin && slotRange.endMin >= range.endMin;
}

export function normalizeEventRangeForConflict(start?: string | null, end?: string | null) {
    const range = normalizeTimeRange(start, end);
    if (range) return range;
    return { start: "00:00", end: "24:00", startMin: 0, endMin: 24 * 60 };
}

import { describe, expect, it } from "vitest";
import {
    normalizeEventRangeForConflict,
    normalizeTimeRange,
    parseTimeToMinutes,
    rangeWithinSlot,
    rangesOverlap,
} from "./time.js";

describe("time helpers", () => {
    it("parses HH:mm into total minutes", () => {
        expect(parseTimeToMinutes("00:00")).toBe(0);
        expect(parseTimeToMinutes("14:30")).toBe(870);
        expect(parseTimeToMinutes("23:59")).toBe(1439);
    });

    it("normalizes valid time ranges and rejects invalid ones", () => {
        expect(normalizeTimeRange("10:00", "14:00")).toEqual({
            start: "10:00",
            end: "14:00",
            startMin: 600,
            endMin: 840,
        });
        expect(normalizeTimeRange("14:00", "10:00")).toBeNull();
        expect(normalizeTimeRange("10:00", "10:00")).toBeNull();
        expect(normalizeTimeRange("invalid", "12:00")).toBeNull();
    });

    it("detects overlap correctly", () => {
        const morning = normalizeTimeRange("09:00", "11:00");
        const overlap = normalizeTimeRange("10:30", "12:30");
        const separate = normalizeTimeRange("12:30", "14:00");

        expect(morning).not.toBeNull();
        expect(overlap).not.toBeNull();
        expect(separate).not.toBeNull();

        expect(rangesOverlap(morning!, overlap!)).toBe(true);
        expect(rangesOverlap(morning!, separate!)).toBe(false);
    });

    it("checks slot containment and all-day fallback behavior", () => {
        const eventRange = normalizeTimeRange("13:00", "15:00");
        expect(eventRange).not.toBeNull();

        expect(rangeWithinSlot(eventRange!, "12:00", "16:00")).toBe(true);
        expect(rangeWithinSlot(eventRange!, "14:00", "16:00")).toBe(false);

        expect(normalizeEventRangeForConflict(undefined, undefined)).toEqual({
            start: "00:00",
            end: "24:00",
            startMin: 0,
            endMin: 1440,
        });
    });
});

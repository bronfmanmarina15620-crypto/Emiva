import { describe, expect, it } from "vitest";
import {
  buildGreeting,
  continuityFrom,
  timeOfDay,
} from "@/lib/greetings";

const DET = () => 0;

describe("greetings", () => {
  describe("timeOfDay", () => {
    it("morning 5–12", () => {
      expect(timeOfDay(new Date("2026-04-19T08:00:00"))).toBe("morning");
    });
    it("afternoon 12–17", () => {
      expect(timeOfDay(new Date("2026-04-19T14:00:00"))).toBe("afternoon");
    });
    it("evening 17–5", () => {
      expect(timeOfDay(new Date("2026-04-19T19:00:00"))).toBe("evening");
      expect(timeOfDay(new Date("2026-04-19T02:00:00"))).toBe("evening");
    });
  });

  describe("continuityFrom", () => {
    const now = new Date("2026-04-19T10:00:00");
    it("null → first_today", () => {
      expect(continuityFrom(null, now)).toBe("first_today");
    });
    it("within 8h → returning_same_day", () => {
      const earlier = now.getTime() - 2 * 60 * 60 * 1000;
      expect(continuityFrom(earlier, now)).toBe("returning_same_day");
    });
    it("≥ 4 days → after_break", () => {
      const earlier = now.getTime() - 5 * 24 * 60 * 60 * 1000;
      expect(continuityFrom(earlier, now)).toBe("after_break");
    });
    it("Sunday + ≥ 1 day → new_week", () => {
      const sunday = new Date("2026-04-19T10:00:00");
      expect(sunday.getDay()).toBe(0);
      const earlier = sunday.getTime() - 2 * 24 * 60 * 60 * 1000;
      expect(continuityFrom(earlier, sunday)).toBe("new_week");
    });
  });

  describe("buildGreeting", () => {
    it("never returns empty", () => {
      for (let i = 0; i < 50; i++) {
        const g = buildGreeting(null, null, new Date(), () => i / 50);
        expect(g.length).toBeGreaterThan(2);
      }
    });

    it("no banned fixed-mindset phrases", () => {
      const pools = 50;
      for (let i = 0; i < pools; i++) {
        const g = buildGreeting(null, null, new Date(), () => i / pools);
        expect(g).not.toMatch(/חכמ/);
        expect(g).not.toContain("תוכיחי");
        expect(g).not.toMatch(/הכי טוב/);
      }
    });

    it("morning → uses morning pool", () => {
      const g = buildGreeting(null, null, new Date("2026-04-20T08:00:00"), DET);
      expect(g).toContain("בוקר");
    });

    it("returning same day uses dedicated pool", () => {
      const now = new Date("2026-04-20T15:00:00");
      const earlier = now.getTime() - 1 * 60 * 60 * 1000;
      const g = buildGreeting(earlier, null, now, DET);
      expect(["חזרת — יופי", "עוד סיבוב? בואי", "טוב שחזרת"]).toContain(g);
    });

    it("multiple variants per pool (avoid staleness)", () => {
      const now = new Date("2026-04-20T08:00:00");
      const seen = new Set<string>();
      for (let i = 0; i < 20; i++) {
        seen.add(buildGreeting(null, null, now, () => i / 20));
      }
      expect(seen.size).toBeGreaterThanOrEqual(3);
    });

    it("prefixes name when provided", () => {
      const g = buildGreeting(null, "TestName", new Date("2026-04-20T08:00:00"), DET);
      expect(g.startsWith("TestName, ")).toBe(true);
    });

    it("no name prefix when empty string", () => {
      const g = buildGreeting(null, "  ", new Date("2026-04-20T08:00:00"), DET);
      expect(g.startsWith(",")).toBe(false);
    });
  });
});

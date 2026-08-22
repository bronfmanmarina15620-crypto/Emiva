/**
 * ACCOUNTS-001 · P1 — ה-backend של שכבת-הגישה.
 *
 * הממשק נולד async בזמן ש-`localStorage` מאחוריו. הבדיקות כאן
 * מקבעות את החוזה ש-P2 יצטרך לקיים כשהמימוש יעבור לשרת.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  localBackend,
  nullBackend,
  getBackend,
  setBackend,
  type DataBackend,
} from "@/lib/data/backend";

/** `localStorage` מינימלי לסביבת node. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage;
}

describe("localBackend", () => {
  let backend: DataBackend;

  beforeEach(() => {
    backend = localBackend(fakeStorage());
  });

  it("מחזיר null למפתח שלא נכתב", async () => {
    expect(await backend.get("missing")).toBeNull();
  });

  it("כותב וקורא", async () => {
    await backend.set("k", "v");
    expect(await backend.get("k")).toBe("v");
  });

  it("מוחק", async () => {
    await backend.set("k", "v");
    await backend.remove("k");
    expect(await backend.get("k")).toBeNull();
  });

  it("keys מסנן לפי תחילית בלבד", async () => {
    await backend.set("emiva.mastery.v1.a", "1");
    await backend.set("emiva.mastery.v1.b", "2");
    await backend.set("other.key", "3");

    const found = await backend.keys("emiva.mastery.v1");
    expect(found.sort()).toEqual(["emiva.mastery.v1.a", "emiva.mastery.v1.b"]);
  });

  it("keys מחזיר ריק כשאין התאמה", async () => {
    await backend.set("a", "1");
    expect(await backend.keys("nope")).toEqual([]);
  });

  it("קריאה שנכשלת מחזירה null ואינה זורקת", async () => {
    const broken = localBackend({
      getItem() {
        throw new Error("SecurityError");
      },
    } as unknown as Storage);
    expect(await broken.get("k")).toBeNull();
  });
});

describe("nullBackend — רינדור בשרת", () => {
  it("קריאה ריקה, כתיבה נבלעת, בלי לזרוק", async () => {
    const backend = nullBackend();
    await backend.set("k", "v");
    expect(await backend.get("k")).toBeNull();
    expect(await backend.keys("emiva.")).toEqual([]);
    await backend.remove("k");
  });
});

describe("setBackend — ההזרקה ש-P2 תשתמש בה", () => {
  afterEach(() => setBackend(null));

  it("מחליף את המימוש הפעיל", async () => {
    const injected = localBackend(fakeStorage());
    setBackend(injected);
    await getBackend().set("k", "v");
    expect(await injected.get("k")).toBe("v");
  });

  it("null מחזיר לברירת-המחדל", async () => {
    setBackend(nullBackend());
    setBackend(null);
    // בסביבת node אין window — ולכן ברירת-המחדל היא nullBackend.
    expect(await getBackend().get("anything")).toBeNull();
  });
});

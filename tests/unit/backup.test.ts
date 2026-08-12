import { describe, expect, it } from "vitest";
import {
  backupFileName,
  createBackup,
  parseBackup,
  restoreBackup,
} from "@/lib/backup";

class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(i: number): string | null {
    return [...this.store.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

const seed = () => {
  const mem = new MemoryStorage();
  mem.setItem("emiva.profiles.v1", JSON.stringify([{ id: "p1", name: "אווה" }]));
  mem.setItem("emiva.mastery.v1.p1.add_sub_100", '{"correct":7}');
  mem.setItem("emiva.parent_pin_hash.v1", "abc123");
  mem.setItem("emiva.foundation.v1", '[{"at":1}]');
  return mem;
};

describe("backup — collecting state", () => {
  it("captures every emiva key", () => {
    const mem = seed();
    const b = createBackup(1_700_000_000_000, mem)!;
    expect(b.format).toBe("emiva.backup");
    expect(Object.keys(b.data).sort()).toEqual([
      "emiva.foundation.v1",
      "emiva.mastery.v1.p1.add_sub_100",
      "emiva.parent_pin_hash.v1",
      "emiva.profiles.v1",
    ]);
  });

  it("ignores keys belonging to other apps on the same origin", () => {
    const mem = seed();
    mem.setItem("someOtherApp.token", "secret");
    const b = createBackup(1, mem)!;
    expect(b.data["someOtherApp.token"]).toBeUndefined();
  });

  it("includes the parent PIN — a restore that locks the parent out is not a restore", () => {
    const b = createBackup(1, seed())!;
    expect(b.data["emiva.parent_pin_hash.v1"]).toBe("abc123");
  });
});

describe("backup — the round trip that D3 exists for", () => {
  // The scenario: a parent clears her browser (or moves to a new laptop) and
  // every trace of her children's progress is gone. Without this, handing out
  // a link is promising people data loss.
  it("survives a full wipe", () => {
    const mem = seed();
    const file = JSON.stringify(createBackup(1, mem));

    mem.clear();
    expect(mem.getItem("emiva.profiles.v1")).toBeNull();

    const res = restoreBackup(file, mem);
    expect(res).toEqual({ ok: true, keysRestored: 4 });
    expect(mem.getItem("emiva.mastery.v1.p1.add_sub_100")).toBe(
      '{"correct":7}',
    );
    expect(mem.getItem("emiva.profiles.v1")).toContain("אווה");
  });

  it("replaces rather than merges, so a deleted profile stays deleted", () => {
    const mem = seed();
    const file = JSON.stringify(createBackup(1, mem));

    // After the backup a second child is added, then we restore the old file.
    mem.setItem("emiva.mastery.v1.p2.multiplication", '{"correct":3}');

    restoreBackup(file, mem);
    expect(mem.getItem("emiva.mastery.v1.p2.multiplication")).toBeNull();
  });

  it("leaves non-emiva keys untouched during restore", () => {
    const mem = seed();
    const file = JSON.stringify(createBackup(1, mem));
    mem.setItem("someOtherApp.token", "secret");

    restoreBackup(file, mem);
    expect(mem.getItem("someOtherApp.token")).toBe("secret");
  });
});

describe("backup — rejecting bad input before destroying good data", () => {
  // A half-applied restore is worse than a refused one: the parent believes
  // she restored, and the real progress is already gone.
  it("refuses malformed JSON without clearing anything", () => {
    const mem = seed();
    expect(restoreBackup("{not json", mem)).toEqual({
      ok: false,
      reason: "unreadable",
    });
    expect(mem.getItem("emiva.profiles.v1")).not.toBeNull();
  });

  it("refuses a valid JSON file that is not an Emiva backup", () => {
    const mem = seed();
    const res = restoreBackup(JSON.stringify({ hello: "world" }), mem);
    expect(res).toEqual({ ok: false, reason: "wrong_format" });
    expect(mem.getItem("emiva.profiles.v1")).not.toBeNull();
  });

  it("refuses a backup written by a newer version of the app", () => {
    const mem = seed();
    const future = JSON.stringify({
      format: "emiva.backup",
      version: 99,
      createdAt: 1,
      data: {},
    });
    expect(restoreBackup(future, mem)).toEqual({
      ok: false,
      reason: "future_version",
    });
    expect(mem.getItem("emiva.profiles.v1")).not.toBeNull();
  });

  it("parseBackup accepts a well-formed file", () => {
    const good = JSON.stringify(createBackup(1, seed()));
    const parsed = parseBackup(good);
    expect("ok" in parsed).toBe(false);
  });
});

describe("backup — file name", () => {
  it("is dated and stable", () => {
    expect(backupFileName(new Date(2026, 7, 12).getTime())).toBe(
      "emiva-backup-2026-08-12.json",
    );
  });
});

/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { runEnglishResetMigration } from "@/lib/storage";

/**
 * מיגרציית האיפוס של 2026-08-06 — ראי runEnglishResetMigration ב-storage.ts.
 * הבדיקה נועדה לוודא שהיא מוחקת בדיוק את מה שצריך: לא פחות (ציון מזויף
 * ששורד ימשיך להסתיר מילים שהילדה לא יודעת) ולא יותר (מחיקת מתמטיקה או
 * פרופילים היא איבוד התקדמות אמיתית של ילדה).
 */

const FLAG = "emiva.migration.english_shuffle_reset.v1";

describe("מיגרציית איפוס האנגלית", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function seed() {
    // ציוני אנגלית — אמורים להימחק, לשתי הבנות
    window.localStorage.setItem("emiva.mastery.v1.p-eve.english_vocab", "{}");
    window.localStorage.setItem("emiva.mastery.v1.p-emi.english_vocab", "{}");
    window.localStorage.setItem("emiva.graduated.v1.p-eve.english_vocab", "1");
    window.localStorage.setItem(
      "emiva.bank_exhausted.v1.p-eve.english_vocab",
      "1",
    );
    window.localStorage.setItem(
      "emiva.measurement.v1.p-eve.english_vocab",
      "{}",
    );
    // כל השאר — חייב לשרוד
    window.localStorage.setItem("emiva.mastery.v1.p-eve.add_sub_100", "{}");
    window.localStorage.setItem(
      "emiva.mastery.v1.p-eve.hebrew_comprehension",
      "{}",
    );
    window.localStorage.setItem("emiva.graduated.v1.p-eve.multiplication", "1");
    window.localStorage.setItem("emiva.puppy_journal.v1.p-eve", "{}");
    window.localStorage.setItem("emiva.last_session.v1.p-eve", "123");
    window.localStorage.setItem("emiva.profiles.v1", "[]");
  }

  it("מוחקת את כל ציוני האנגלית של שתי הבנות", () => {
    seed();
    runEnglishResetMigration();

    const leftovers: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.endsWith(".english_vocab")) leftovers.push(key);
    }
    expect(leftovers).toEqual([]);
  });

  it("לא נוגעת במתמטיקה, בהבנת-הנקרא, ביומן-הגור ובפרופילים", () => {
    seed();
    runEnglishResetMigration();

    for (const key of [
      "emiva.mastery.v1.p-eve.add_sub_100",
      "emiva.mastery.v1.p-eve.hebrew_comprehension",
      "emiva.graduated.v1.p-eve.multiplication",
      "emiva.puppy_journal.v1.p-eve",
      "emiva.last_session.v1.p-eve",
      "emiva.profiles.v1",
    ]) {
      expect(window.localStorage.getItem(key), key).not.toBeNull();
    }
  });

  it("רצה פעם אחת בלבד — התקדמות אנגלית חדשה לא נמחקת בטעינה הבאה", () => {
    seed();
    runEnglishResetMigration();
    expect(window.localStorage.getItem(FLAG)).toBe("1");

    // הילדה מתאמנת מחדש אחרי האיפוס, בסדר-כפתורים מעורבב והוגן.
    window.localStorage.setItem(
      "emiva.mastery.v1.p-eve.english_vocab",
      '{"real":true}',
    );
    runEnglishResetMigration();

    expect(
      window.localStorage.getItem("emiva.mastery.v1.p-eve.english_vocab"),
    ).toBe('{"real":true}');
  });

  it("לא נופלת כשאין מה למחוק", () => {
    expect(() => runEnglishResetMigration()).not.toThrow();
    expect(window.localStorage.getItem(FLAG)).toBe("1");
  });
});

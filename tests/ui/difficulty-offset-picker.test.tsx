// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useParams: () => ({ id: "p-test" }),
}));

import EditProfilePage from "@/app/profiles/edit/[id]/page";
import { loadProfiles, saveProfiles, type Profile } from "@/lib/profiles";

// בחירה לפי ה-value של הרדיו ולא לפי הטקסט: התוויות הן מחרוזות
// שפונות להורה ועשויות להתנסח מחדש, והבדיקה לא אמורה להישבר מזה.
// (הטקסט עצמו נבדק בנפרד בבדיקת-הטון הראשונה.)
function offsetRadio(value: 0 | 1 | 2): HTMLInputElement {
  const el = document.querySelector(
    `input[name="difficultyOffset"][value="${value}"]`,
  );
  if (!el) throw new Error(`לא נמצאה אפשרות עם value=${value}`);
  return el as HTMLInputElement;
}

function seed(over: Partial<Profile> = {}) {
  const p: Profile = {
    id: "p-test",
    name: "ילד",
    age: 7,
    allowedSkills: [],
    createdAt: 1,
    ...over,
  };
  saveProfiles([p]);
}

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
  replaceMock.mockReset();
});

/**
 * BL-021 — קצב ההתחלה.
 *
 * הבדיקה הראשונה היא **כלל-טון מקודד**, לא אסתטיקה: `pedagogy.md`
 * §טון ו-guardrails §2 אוסרים מסגור שמסמן ילד/ה ככישלון. שליטה
 * שנקראת "רמת קושי" עם תווית "מתקשה" הייתה מפרה אותם — ולכן
 * הניסוח נבדק ולא רק נכתב.
 */
describe("<DifficultyOffsetPicker> — קצב ההתחלה (BL-021)", () => {
  it("מנוסח כמצב של ההורה, לא כרמה של הילד", async () => {
    seed();
    render(<EditProfilePage />);

    expect(await screen.findByText("קצב ההתחלה")).toBeInTheDocument();
    expect(screen.queryByText(/מתקשה/)).not.toBeInTheDocument();
    expect(screen.queryByText(/חלש/)).not.toBeInTheDocument();
    expect(screen.queryByText(/מאחור/)).not.toBeInTheDocument();
    expect(screen.queryByText(/לא מצליח/)).not.toBeInTheDocument();
  });

  // GENDER-INCLUSIVE-001: המסך פונה להורה על ילד/ה שהמין שלו/ה לא
  // ידוע כאן. ניסוח בזכר ("יושבת לידו", "הוא נמצא") סותר את החוזה
  // שנשלח קומיט אחד קודם, ושתי המשתמשות של v1 הן בנות. נתפס
  // בסקירת-קוד — רשימת-המילים של בדיקת-הטון לא כיסתה מגדר.
  it("לא מניח מין של הילד/ה בשורות-העזר", async () => {
    seed();
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    // בלי `\b`: בג'אווהסקריפט גבול-מילה מוגדר מול תווי ASCII בלבד,
    // ולכן אחרי אות עברית הוא לעולם לא נדלק — ההשוואה הייתה מתה
    // והרגרסיה שהבדיקה נועדה לתפוס הייתה עוברת בירוק (נמצא בסקירה).
    expect(screen.queryByText(/יושבת לידו/)).not.toBeInTheDocument();
    expect(screen.queryByText(/יושב לידה/)).not.toBeInTheDocument();
    expect(screen.queryByText(/שהוא נמצא/)).not.toBeInTheDocument();
    expect(screen.queryByText(/שהיא נמצאת/)).not.toBeInTheDocument();
  });

  it("מציע שלוש אפשרויות", async () => {
    seed();
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    expect(offsetRadio(0)).toBeInTheDocument();
    expect(offsetRadio(1)).toBeInTheDocument();
    expect(offsetRadio(2)).toBeInTheDocument();
  });

  it("שומר את הבחירה על הפרופיל", async () => {
    const user = userEvent.setup();
    seed();
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    await user.click(offsetRadio(1));
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]?.difficultyOffset).toBe(1);
    });
  });

  it("שומר גם את האפשרות של שתי דרגות", async () => {
    const user = userEvent.setup();
    seed();
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    await user.click(offsetRadio(2));
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]?.difficultyOffset).toBe(2);
    });
  });

  it("מציג את הערך הקיים כשנכנסים למסך", async () => {
    seed({ difficultyOffset: 1 });
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    expect(offsetRadio(1)).toBeChecked();
  });

  it("פרופיל בלי ערך מוצג כ'רגיל'", async () => {
    seed();
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    expect(offsetRadio(0)).toBeChecked();
  });

  // נמצא בסקירת-קוד: פרופיל בלי ערך שמור מציג את "רגיל" כמסומן,
  // ולכן לחיצה עליו אינה מייצרת onChange כלל. עם state שמתחיל
  // כ-undefined השמירה הייתה מדלגת על הכתיבה בשקט — ההורה בוחרת
  // "רגיל" ושום דבר לא נשמר. הבדיקה הקודמת פספסה את זה כי היא
  // זורעת ערך קיים תחילה.
  it("בחירת 'רגיל' בפרופיל בלי ערך שמור — נכתבת בפועל", async () => {
    const user = userEvent.setup();
    seed(); // בלי difficultyOffset כלל
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    await user.click(offsetRadio(0));
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]?.difficultyOffset).toBe(0);
    });
  });

  // נמצא בסקירת-קוד: הפרופיל נמחק בטאב אחר בזמן העריכה. קודם המסך
  // ניווט הביתה כאילו נשמר, והכתיבה נפלה בשקט.
  it("פרופיל שנמחק בזמן העריכה — מודיע ולא מנווט כאילו נשמר", async () => {
    const user = userEvent.setup();
    seed();
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    await user.click(offsetRadio(1));
    saveProfiles([]); // נמחק מתחת לרגליים
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    expect(await screen.findByText(/הפרופיל כבר לא קיים/)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // נתיב-החזרה: ההורה מכבה את ההורדה. זו הבחירה שהזריעה הישנה
  // הייתה מבטלת בטעינה הבאה.
  it("מאפשר לחזור ל'רגיל' והבחירה נשמרת", async () => {
    const user = userEvent.setup();
    seed({ difficultyOffset: 1 });
    render(<EditProfilePage />);
    await screen.findByText("קצב ההתחלה");

    await user.click(offsetRadio(0));
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]?.difficultyOffset).toBe(0);
    });
  });
});

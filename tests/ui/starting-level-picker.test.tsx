// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

import NewProfilePage from "@/app/profiles/new/page";
import { loadProfiles } from "@/lib/profiles";
import { exportTelemetry } from "@/lib/telemetry";

// בחירה לפי ה-value של הרדיו ולא לפי הטקסט: התוויות הן מחרוזות
// שפונות להורה ועשויות להתנסח מחדש. הטקסט עצמו נבדק בנפרד
// בבדיקות-הטון.
function levelRadio(value: 1 | 3 | 5): HTMLInputElement {
  const el = document.querySelector(
    `input[name="startingLevel"][value="${value}"]`,
  );
  if (!el) throw new Error(`לא נמצאה אפשרות עם value=${value}`);
  return el as HTMLInputElement;
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByRole("textbox"), "ילד");
  await user.clear(screen.getByRole("spinbutton"));
  await user.type(screen.getByRole("spinbutton"), "9");
}

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
  replaceMock.mockReset();
});

/**
 * BL-017 — נקודת-הפתיחה במסך ההרשמה.
 *
 * שתי הבדיקות הראשונות הן **כללי-טון מקודדים**, לא אסתטיקה:
 * `pedagogy.md` §טון אוסר מסגור שמסמן ילד/ה ככישלון, ומבחן-מיקום
 * בכניסה סותר את עקרון ה-growth-mindset. שאלה שתתנסח כ"רמת הילד"
 * או "מבחן" היא בדיוק מה ש-Marina דחתה.
 */
describe("<StartingLevelPicker> — נקודת-הפתיחה (BL-017)", () => {
  it("מנוסח כשאלה על החומר, לא כמבחן רמה", async () => {
    render(<NewProfilePage />);

    expect(await screen.findByText("מאיפה להתחיל?")).toBeInTheDocument();
    expect(screen.queryByText(/מבחן/)).not.toBeInTheDocument();
    expect(screen.queryByText(/רמת הילד/)).not.toBeInTheDocument();
    expect(screen.queryByText(/מתקשה/)).not.toBeInTheDocument();
    expect(screen.queryByText(/חלש/)).not.toBeInTheDocument();
    expect(screen.queryByText(/מאחור/)).not.toBeInTheDocument();
    expect(screen.queryByText(/לא מצליח/)).not.toBeInTheDocument();
  });

  it("לא מניח מין של הילד/ה", async () => {
    render(<NewProfilePage />);
    await screen.findByText("מאיפה להתחיל?");

    // בלי `\b`: בג'אווהסקריפט גבול-מילה מוגדר מול תווי ASCII בלבד,
    // ולכן אחרי אות עברית הוא לעולם לא נדלק — ההשוואה הייתה מתה
    // (נמצא בסקירת-קוד 2026-08-14).
    expect(screen.queryByText(/מכיר את החומר/)).not.toBeInTheDocument();
    expect(screen.queryByText(/מכירה את החומר/)).not.toBeInTheDocument();
    expect(screen.queryByText(/שהוא כבר/)).not.toBeInTheDocument();
    expect(screen.queryByText(/שהיא כבר/)).not.toBeInTheDocument();
  });

  it("מציע שלוש אפשרויות", async () => {
    render(<NewProfilePage />);
    await screen.findByText("מאיפה להתחיל?");

    expect(levelRadio(1)).toBeInTheDocument();
    expect(levelRadio(3)).toBeInTheDocument();
    expect(levelRadio(5)).toBeInTheDocument();
  });

  // ההבדל המבני מול DifficultyOffsetPicker: שם `value ?? 0` מסמן את
  // ברירת-המחדל מראש, ולחיצה עליה לא ייצרה onChange — באג שנתפס
  // בסקירה. כאן דילוג הוא מצב אמיתי שחייב להישאר ניתן-לייצוג, ולכן
  // שום אפשרות אינה מסומנת. הבדיקה נועלת את זה: מי שיוסיף `?? 1`
  // יהפוך "דילג" ל"ענה 1" ויעוור את הטלמטריה.
  it("שום אפשרות אינה מסומנת מראש", async () => {
    render(<NewProfilePage />);
    await screen.findByText("מאיפה להתחיל?");

    expect(levelRadio(1)).not.toBeChecked();
    expect(levelRadio(3)).not.toBeChecked();
    expect(levelRadio(5)).not.toBeChecked();
  });

  it("אפשר לדלג — פרופיל נשמר בלי לענות", async () => {
    const user = userEvent.setup();
    render(<NewProfilePage />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]).toBeDefined();
    });
    expect(loadProfiles()[0]?.startingLevel).toBeUndefined();
  });

  it("בחירת 'מההתחלה' נשמרת ואינה נבלעת כדילוג", async () => {
    const user = userEvent.setup();
    render(<NewProfilePage />);
    await fillRequired(user);
    await user.click(levelRadio(1));
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]?.startingLevel).toBe(1);
    });
  });

  it("הבחירה נשמרת בפרופיל", async () => {
    const user = userEvent.setup();
    render(<NewProfilePage />);
    await fillRequired(user);
    await user.click(levelRadio(5));
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]?.startingLevel).toBe(5);
    });
  });

  it("הדילוג נרשם בטלמטריה כ-null, לא כדרגה 1", async () => {
    const user = userEvent.setup();
    render(<NewProfilePage />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "שמירה" }));

    await waitFor(() => {
      expect(loadProfiles()[0]).toBeDefined();
    });
    const id = loadProfiles()[0]!.id;
    // exportTelemetry מחזיר JSON כמחרוזת, לא מערך.
    const events = JSON.parse(exportTelemetry(id)) as {
      t: string;
      level?: number | null;
    }[];
    const ev = events.find((e) => e.t === "starting_level_chosen");
    expect(ev).toBeDefined();
    // null ולא 1 — אחרת אי-אפשר להבחין בין דילוג ל"ענו מההתחלה".
    expect(ev?.level).toBeNull();
  });
});

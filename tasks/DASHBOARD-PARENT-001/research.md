# Research log — DASHBOARD-PARENT-001

Four rounds of research preceded this task's INSTRUCTIONS. Summary below;
full source links at the end.

## Round 1 — Western edtech + design authorities

Products reviewed: Khan Academy, Duolingo, Prodigy, IXL, DreamBox, ALEKS,
Zearn, Beast Academy, Math Academy, Matific. Authorities: Stephen Few
(Information Dashboard Design), Avinash Kaushik (Action Dashboard),
Stacey Barr (KPI traffic-light critique).

Key signals:
- Single traffic-light per child is the weakest pattern (Stacey Barr).
  Leaders use per-metric indicators, never per-person.
- Mastery-first products split *not-started / in-progress / mastered*
  (ALEKS pie, Beast 0/1/2/3 stars, DreamBox Standards).
- Dominant "first glance" metric is a time goal or streak, not accuracy
  (Duolingo, Math Academy). Accuracy reads judgmental.
- The "Action Dashboard" pattern (Kaushik) — every dashboard should
  convert data to a next-step recommendation. IXL "Trouble Spots",
  DreamBox "Standards Report", ALEKS "Ready to Learn" all do this.
- Wheel-spinning (ASSISTments, Beck & Gong 2013; Botelho et al. 2019)
  is the strongest research-backed struggle signal.

## Round 2a — Asian edtech (China + India)

Products reviewed: Byju's (India), Squirrel AI (China), Yuanfudao,
17zuoye, Xueersi/TAL, Kumon Connect, WhiteHat Jr, Toppr.

Key signals:
- **Squirrel AI's "tracing the source":** every difficulty flag names
  the upstream weak skill likely causing it. Converts status report to
  diagnostic tool. Claims 56→89% mastery gain from this single affordance.
- **Xueersi xPad:** push-to-parent, not pull. Parent doesn't open a
  dashboard — weekly personalized report arrives via messaging app.
- **Byju's Parent Connect:** separate SKU. Framed as "Strengths & Areas
  of Improvement", not "wrong answers". Weekly + monthly cadence.
- **Kumon Connect:** time × accuracy (both tracked on every worksheet);
  star chart for daily-work completion framed as habit discipline,
  not gamification.
- **Zhixuewang ranking culture (China):** real pattern, culturally
  hostile to Emiva's growth-mindset rule. **Explicitly rejected.**

## Round 2b — Academic research on parent-dashboard efficacy

This round changed the plan the most.

Key papers:
1. **Lu, Vasilyeva & Laski 2025 (Child Development, n=122 dyads age 5):**
   Informational priming (telling parents what math to work on) **increased
   parents' controlling language, decreased child autonomy support,
   increased child disengagement**. Medium effect sizes. The closest
   analog to a parent dashboard for young kids that exists in the
   literature — and the direction is wrong.
2. **Bergman 2021 (JPE):** Biweekly info to parents raised GPA +0.10 SD;
   **49% of the effect mediated by *belief correction*** — parents
   systematically over-estimate child effort. This is the strongest
   causal mechanism. No state-test effect.
3. **Bergman & Chan 2021 (JHR, n=22 schools):** Automated weekly alerts
   cut course failures by 27%, boosted attendance 12%. No state-test
   movement. Cost: $63 total.
4. **Kraft & Rogers 2015 (EER):** Weekly one-sentence teacher-to-parent
   messages cut failure rate 41%. Messages about *what to improve*
   beat messages about *what's going well*.
5. **Kaliisa et al. 2024 (LAK systematic review, 38 studies):** Most
   LADs show negligible-to-small effects on achievement. Engagement ≠
   outcomes is the open question.
6. **EWIMS RCT (REL-Midwest 2017, n=35k):** Early-warning + monitoring
   cut absence and course failure; GPA unmoved. **Dashboards move
   consistency, not learning.**

Implications locked in:
- Action line must be **invitational, not instructional** (Lu 2025).
- Dashboard must be **closed when child is present** (Lu 2025).
- **Belief calibration** is the active mechanism — include a parent
  weekly note + reality comparison (Bergman).
- Don't overclaim: expected impact is on **engagement/consistency**,
  not on test scores.

## Round 2c — Non-edtech parent dashboards

Products reviewed: Greenlight, GoHenry, Bark, Nanit, Qustodio, Apple
Screen Time, Google Family Link, Cozi, FamilyWall.

Key signals:
- **Bark anatomy (weekly email):** analyzed / flagged / top items /
  one recommendation. Skim in 20 seconds. Parents don't dashboard,
  they glance.
- **Nanit verdict framing:** "on track / watch / act." Never raw
  numbers in the primary view.
- **Greenlight dual view:** same data, kid sees their own framing.
  Eliminates parent-kid asymmetry.
- **Sensitivity slider for alerts** to fight false-positive fatigue.
- **Anti-patterns to reject:** sibling comparison (cortisol, not
  motivation), parent-streak gamification (turns parent into nagger),
  real-time push per session (trains parent to interrupt).

## Design decisions derived from research

Locked in INSTRUCTIONS.md:
1. Verdict badge per daughter (Nanit), not traffic-light on the person.
2. Invitation-framed action line (Lu 2025).
3. "Possible cause" line naming upstream weak skill (Squirrel).
4. Skill-tile grid, not 3-bucket pipeline bar (Squirrel, ALEKS).
5. Weekly belief-correction form + reality comparison (Bergman).
6. Wheel-spinning indicator (ASSISTments).
7. Product rule: dashboard closed when child present (Lu 2025).
8. Weekly digest as primary artifact (Bark anatomy).
9. Banned patterns: sibling comparison, parent-streak gamification,
   real-time push, informational priming without autonomy framing.
10. Honest scope: expect consistency improvement, not learning gains
    (Kaliisa, EWIMS).

Falsifier locked in (honest-about-not-working rule): if after 4 weeks
the parent submits fewer than 2 belief-correction notes, the eval
`evals/backlog/dashboard-followthrough.eval.ts` goes red → stop,
rethink.

## Sources by type (per CLAUDE.md §Research source rule)

### (a) Cognitive science / learning research

- [Lu, Vasilyeva & Laski 2025 — Child Development](https://onlinelibrary.wiley.com/doi/10.1111/cdev.70031)
- [Bergman 2021 — JPE](https://www.journals.uchicago.edu/doi/10.1086/711410)
- [Bergman & Chan 2021 — JHR](https://jhr.uwpress.org/content/56/1/125)
- [Kraft & Rogers 2015 — EER (PDF)](https://scholar.harvard.edu/files/todd_rogers/files/empirical_in_press.kraft_rogers.pdf)
- [Kaliisa et al. 2024 — LAK systematic review](https://arxiv.org/pdf/2312.15042)
- [REL-Midwest 2017 — EWIMS RCT](https://ies.ed.gov/use-work/resource-library/report/impact-study/getting-students-track-graduation-impacts-early-warning-intervention-and-monitoring-system-after-one)
- [Botelho et al. 2019 — Wheel-Spinning Deep Learning (NSF)](https://par.nsf.gov/biblio/10095357)
- [Kai / Baker — JEDM wheel-spinning](https://jedm.educationaldatamining.org/index.php/JEDM/article/download/210/88)
- [Montazami — Why this app? (BJET)](https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.13213)
- [Boaler / Youcubed — parents' math beliefs](https://www.youcubed.org/evidence/parents-beliefs-math-change-childrens-achievement/)

### (b) Company practice & dashboard design

- [Squirrel AI — MIT Tech Review](https://www.technologyreview.com/2019/08/02/131198/china-squirrel-has-started-a-grand-experiment-in-ai-education-it-could-reshape-how-the/)
- [Squirrel AI — Wikipedia](https://en.wikipedia.org/wiki/Squirrel_AI)
- [Xueersi xPad — China Daily](https://www.chinadaily.com.cn/a/202505/09/WS681de175a310a04af22be70e.html)
- [Byju's Parent Connect](https://momlifeandlifestyle.com/2021/10/be-a-companion-in-your-childs-progress-byjus-parent-connect-app/)
- [Kumon Connect](https://www.kumon.com/kumon-connect)
- [Khan Academy Parent Dashboard](https://support.khanacademy.org/hc/en-us/articles/360039664491-What-can-I-do-from-the-Khan-Academy-Parent-Dashboard)
- [ALEKS Student Reports Guide (PDF)](https://www.mheducation.com/unitas/school/explore/sites/aleks/student-parent-resources-guide-to-student-reports-english.pdf)
- [IXL Analytics for Parents (PDF)](https://www.ixl.com/materials/Analytics_Guide_for_Parents.pdf)
- [DreamBox Family Dashboard](https://dreamboxlearning.zendesk.com/hc/en-us/articles/27282140847251)
- [Beast Academy Parent Reporting](https://help.beastacademy.com/a/1793720-parent-reporting-overview)
- [Greenlight — kids' view](https://help.greenlight.com/hc/en-us/articles/360019317134-How-can-my-children-see-and-manage-their-chores)
- [Bark — weekly email anatomy](https://support.bark.us/hc/en-us/articles/27958827919757-Get-insights-into-your-child-s-activity)
- [Nanit Insights](https://www.nanit.com/products/nanit-insights)
- [Qustodio](https://www.qustodio.com/en/parental-control-app/)
- [Cozi FAQ](https://www.cozi.com/faq/)

### Design authorities

- [Kaushik — Action Dashboard](https://www.kaushik.net/avinash/the-action-dashboard-an-alternative-to-crappy-dashboards/)
- [Stephen Few — Information Dashboard Design (PDF)](https://public.magendanz.com/Temp/Information%20Dashboard%20Design.pdf)
- [Stacey Barr — traffic-light KPI critique](https://www.staceybarr.com/measure-up/3-problems-with-traditional-kpi-traffic-lights/)
- [Enabling Insights — 11 Edtech dashboard principles](https://enablinginsights.com/how-to-design-more-actionable-edtech-dashboards-eleven-principles/)
- [EverydayIndustries — parent trust](https://everydayindustries.com/beyond-dashboards-generative-ui-parent-trust-edtech/)
- [SoLAR — data presentation and student motivation](https://www.solaresearch.org/2020/10/how-data-presentation-can-help-student-motivation/)

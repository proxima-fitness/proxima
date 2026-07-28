# CrossFit-style (GPP / WOD)

Apply these guidelines when designing or editing **CrossFit-style** training: **general physical preparedness (GPP)** using **varied functional movements**, typically combined with **metabolic conditioning** (“metcon”) and **strength or skill** work. The goal is **broad, inclusive fitness** or **competition-oriented conditioning**, not maximizing a single lift or muscle group in isolation.

**Disclaimer:** **CrossFit** is a registered trademark of CrossFit, LLC. This document summarizes **commonly published programming ideas** for building workouts in tools that use gym exercise templates; it is **educational**, not affiliated with or endorsed by CrossFit, LLC. It does **not** reproduce trademarked benchmark workouts in full.

---

## What this is

- **Common prescription (literature):** **Constantly varied, high-intensity, functional movement**-with **intensity** often discussed as **power** (work done per unit time) as a key variable for adaptation.
- **Not the same as “random”:** Good programming varies **time domains**, **loads**, and **movement types** on purpose so capacity stays **broad**-often summarized as **constantly varied, not random**.
- **Modalities (typical three “buckets”):**
  - **Weightlifting / strength:** squats, presses, deadlifts, Olympic lifts and derivatives (when skill-appropriate).
  - **Gymnastics / bodyweight:** pulling, pushing, core, inverted skills-scaled to the athlete.
  - **Monostructural conditioning:** run, row, bike, ski, etc.
- **Fitness model (brief):** CrossFit training discussions often reference **10 general physical skills**-cardiovascular/respiratory endurance, stamina, strength, flexibility, power, speed, coordination, agility, balance, and accuracy-so programming avoids **narrow** specialization for GPP. See CrossFit’s public “What Is Fitness?” / **10 physical skills** material for the canonical list ([CrossFit.com essentials](https://www.crossfit.com/essentials/what-is-fitness-lecture-10-physical-skills)).

---

## Core principles

1. **Structure + variation:** Across each **week** and **mesocycle**, include a **mix** of short, moderate, and longer efforts; light, moderate, and heavier days; and different movement patterns-not the same metcon template every day.
2. **Intensity is earned:** Not every session is a **max effort**. Use **hard** days, **moderate** days, and **recovery / technique** days so the athlete can absorb load.
3. **Functional priority:** Multi-joint, full-range patterns that translate to real tasks; scale before contorting load or volume unsafely.
4. **Recovery:** Space **high-impact** or **high-skill** sessions so joints and the nervous system recover-especially for newer athletes or high-frequency training.

---

## Time domains

- **Short (often roughly under ~10 minutes):** High power, sprint-style work-very demanding per minute.
- **Moderate (~10-20+ minutes):** Sustainable high pace; tests pacing and transitions.
- **Longer (20+ minutes):** Aerobic power and mental pacing; still use good movement standards.

Aim to touch **more than one** domain per week unless the user has a specific block focused on one area.

---

## Session structure (flexible)

Many **class-style** templates follow a loose flow:

1. **Warm-up / prep** - easy movement, mobility, activation (often described in **`routine notes`** if not individual exercises).
2. **Strength or skill** - heavier barbell work, strength skill, or gymnastics progression.
3. **Metcon (WOD)** - timed or capped conditioning piece.
4. **Cool-down** - optional; notes.

**Adapt to frequency:** With **fewer days per week**, sessions may **combine** strength + metcon. With **more days**, you might separate **strength**, **short metcon**, and **long conditioning** on different days.

---

## WOD formats (express in notes / reason)

The build tools may not have a dedicated “WOD type” field-encode format in **`routine notes`** and exercise **`reason`**:

| Format | Idea | Example note snippet |
|--------|------|----------------------|
| **For time** | Fixed work, minimize time | “For time: 21-15-9 of A / B / C” |
| **AMRAP** | Max rounds/reps in a cap | “12:00 AMRAP: 5 pull-ups, 10 push-ups, 15 squats” |
| **EMOM** | Work each minute | “EMOM 12: odd min 15 KB swings, even min 10 burpees” |
| **Rounds** | Fixed rounds for time or quality | “5 rounds for time…” |
| **Chipper** | Long list, complete in order | “For time, 50-40-30-… reps of … in order” |

Use **`notes`** for **time caps**, **rep schemes**, and **rest between pieces** when the prescription spans multiple movements.

---

## Skill, scaling, and safety

- **Technique before load** on Olympic lifts, kipping or high-volume gymnastics, and high-impact jumps.
- **Scale** load, range of motion, volume, or movement choice (e.g. box push-up vs handstand push-up) to preserve **movement quality** and **relative intensity**.
- **Progress** skills with **progressions** (e.g. strict before kipping where applicable), not sudden volume spikes.

---

## Equipment mapping (`getExerciseList`)

- Prefer **real template IDs** from **getExerciseList**: barbell squats, presses, deadlifts, rows, pulls, kettlebell movements, etc., when they exist.
- **Running, double-unders, bike sprints, rig-only** work, or **non-database** items: put prescriptions in **`routine notes`** and tie intent in exercise **`reason`** for the pieces that *are* in the list (e.g. rower substitutes for run when appropriate).
- If the gym **lacks** equipment (e.g. no GHD, no rings), substitute **closest** stimuli and state the swap in **`reason` / `notes`**-never invent exercise IDs.

---

## Competition vs daily training

- **GPP / affiliate-style:** Emphasize **variety**, **skill**, and **long-term durability**; avoid testing competition workouts at max effort every week.
- **Competition prep (light touch):** Bias **specific time domains**, **common movement combinations**, and **repeatable pacing**-without copying trademarked events or workouts verbatim. Official **CrossFit Games** / **Open** details change yearly; point athletes to **current** rules for event-specific prep.

---

## When applying

- **Primary frame:** CrossFit-style = **varied** functional fitness with **conditioning** + **strength/skill**-not a **pure bodybuilding** split, **powerlifting meet prep**, or **Hyrox** race template unless the user asks to **blend** styles.
- **`buildWeek`:** Use **session titles** that reflect the day (e.g. “Strength + short metcon”, “Long conditioning”, “Skill + AMRAP”). Put **WOD format**, **time cap**, and **rep scheme** in **`notes`** when they apply to the whole session.
- **`reason`:** Short prose covering what the movement does, where it fits the day/session structure, and concrete facts (equipment, skill level, weak movements, days/week). No bullet labels required.
- **Optional cross-load:** If the user wants **extra hypertrophy** or **limit strength**, you may secondarily load [`bodybuilding.md`](./bodybuilding.md) or [`powerlifting.md`](./powerlifting.md)-keep **metcon + GPP** priorities unless they say otherwise. For fat-loss nutrition habits, see [`weight-loss/`](./weight-loss/) if relevant.
- Use **only** exercise template IDs returned by **getExerciseList**; never invent IDs.

# Stimulus, hard sets, and weekly volume

Canonical copy for **hypertrophy programming** in Proxima. Load alongside `bodybuilding.md` when the user cares about **effective reps**, **junk volume**, **RPE vs set counting**, or **proximity to failure**.

## Science framing (plain language)

Muscle growth tracks **challenging work**—sets taken with meaningful **effort** (often described as proximity to failure, **effective reps**, or **stimulus per set**)—more closely than “any reps moved” or tonnage alone.

Research often highlights that reps **near** failure contribute disproportionately to the stimulus for a set. The “~last five reps before failure” idea is **one** useful mental model; it is **not** a literal instruction to count five reps on paper for every exercise, and real-world lifting varies by exercise, skill, and fatigue.

## How we operationalize it in product

- **Growth-relevant set:** A **working** set (not a warmup set, not standalone prep work labeled as easy) intended to land around **~0–3 reps in reserve (RIR)** for hypertrophy. On a 1–10 **RPE** scale, that often maps to roughly **~RPE 6–9** on demanding compounds; isolations and machines can sometimes go a bit closer to failure when joint tolerance allows.
- **Weekly volume landmarks (MEV / MAV / MRV)** in our docs and tools are **set-based**: they count **weekly working sets** toward each muscle, **not** sets × reps × weight in the program scorecard. They assume those sets are **hypertrophy-intended hard sets**, not junk volume done far from failure—unless a block is explicitly a **deload** or **technique** phase (then lower RPE or fewer sets is intentional).
- **Tonnage** (weight × reps) can matter for tracking and progression; it is **not** interchangeable with MEV/MAV/MRV **without** redefining those benchmarks.

## Deloads and special phases

**Deload / easy weeks** should be obvious in the prescription: either **fewer working sets**, **lower target RPE**, or both—stated in **notes** or exercise **reason** so intensity is not misread as accidental “junk volume.”

## Program scorecard (builder)

The automated score tallies **non-warmup working sets** per muscle against landmarks. A separate **stimulus** check uses **target RPE** on sets (when logged) to flag missing intensity metadata—not to replace set-count landmarks.

---
name: training-principles
description: >-
  Advice on training and programming principles such as volume, frequency,
  exercise selection, rep ranges, recovery, periodization, fat loss and diet
  adherence, or how to train a specific muscle for hypertrophy. Use when the user
  asks "how much volume," "best exercises for," "how often should I train," "what
  rep range," "MEV vs MRV," weight loss, caloric deficit, cardio for fat loss, or
  similar educational questions. For creating or building a full program, use the
  build-program skill instead.
---

# Training Principles

Provide evidence-based advice on training and programming principles. This skill is educational — it explains *how* and *why* to program, not to construct a program (that is the build-program skill).

## When to use

- User asks how to train a muscle (e.g. "How should I train chest?")
- User asks about volume, frequency, or rep ranges (e.g. "How many sets per week for back?")
- User asks about exercise selection or categories (e.g. "Best exercises for glute hypertrophy?")
- User asks about volume landmarks (MV, MEV, MAV, MRV)
- User asks general hypertrophy or bodybuilding programming questions
- User asks about fat loss, weight loss, diet adherence, or cardio for fat loss (principles, not a full meal plan)

## When NOT to use

- "Build me a program", "Create a 4-day split", "Make me a PPL routine" — use **build-program** instead.

## Available resources

**Hypertrophy / bodybuilding** muscle guides and **weight loss / fat loss** principle notes are implemented below.

### Weight loss / fat loss

| Topic              | File                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Diet and habits    | `.agents/skills/training-principles/resources/weight-loss/diet.md`                         |
| Cardio and exercise | `.agents/skills/training-principles/resources/weight-loss/cardio-exercise.md`               |

### Bodybuilding guides (by muscle)


| Topic      | File                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| Chest      | `.agents/skills/training-principles/resources/bodybuilding/chest-training-guide.md`     |
| Back       | `.agents/skills/training-principles/resources/bodybuilding/back-training-guide.md`      |
| Biceps     | `.agents/skills/training-principles/resources/bodybuilding/bicep-training-guide.md`     |
| Triceps    | `.agents/skills/training-principles/resources/bodybuilding/tricep-training-guide.md`    |
| Quads      | `.agents/skills/training-principles/resources/bodybuilding/quad-training-guide.md`      |
| Hamstrings | `.agents/skills/training-principles/resources/bodybuilding/hamstring-training-guide.md` |
| Glutes     | `.agents/skills/training-principles/resources/bodybuilding/glute-training-guide.md`     |


## How to answer

1. **Fat loss / diet / cardio for fat loss:** If the question touches this, decide whether **diet/habits**, **cardio/exercise**, or both apply. Use `readFile` to load **only** the relevant weight-loss resource(s). Do not load muscle guides unless the question also needs hypertrophy detail.
2. **Hypertrophy or training a muscle:** If the question touches this, identify which muscle(s) and use `readFile` to load **only** the relevant guide(s) from the bodybuilding table. Do not load all guides — they are long and will waste context.
3. Summarise and cite the loaded content. Keep advice practical and aligned with the guides' tone: "food for thought or places to start, not dogmatic scriptures to follow to the letter."
4. If the question is general (e.g. "What is MEV?") and not muscle-specific, load one or two representative guides (e.g. chest + back) to ground your answer in concrete numbers, or explain the concept and offer to dive into a specific muscle.

## Notes

- If the user asks about **powerlifting**, **peaking**, or **strength-focused** principles: acknowledge that only bodybuilding/hypertrophy resources exist in this skill for now. You can still give general principle advice or point them to the build-program skill (which has its own powerlifting context) if they want to build a program.
- Each bodybuilding guide covers volume landmarks, exercise categories with technique notes, rep ranges, frequency, and session-level programming tips. Prioritise the sections most relevant to the user's question rather than dumping everything.
- The weight-loss resources are **principle summaries**, not meal plans or medical advice; stay within what those files state.


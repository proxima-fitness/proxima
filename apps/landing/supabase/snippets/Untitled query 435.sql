SELECT sw."nthWeek", sw."nthDay", pwe.id, pwe.weights, pwe.reps, pwe.rpe, pwe.reps_range
FROM public.schedule_workouts sw
JOIN public.program_workout_exercises pwe ON pwe.schedule_id = sw.id
WHERE sw.program_id = 13
  AND sw."nthWeek" = 2
ORDER BY sw."nthDay", pwe.created_at;
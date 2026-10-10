-- Drop unused public tables left over from the deprecated mobile / social home surface.
-- None of these are queried by the web app (only leftover generated types / marketing copy).

-- Home-page trending carousels (deprecated).
DROP TABLE IF EXISTS public.trending;

-- Mobile-era personal records store (unused; PRs now come from workout backup).
DROP TABLE IF EXISTS public.personal_records;

-- Standalone saved workouts (superseded by programs + program_workout_exercises).
DROP TABLE IF EXISTS public.saved_workout_exercises;
DROP TABLE IF EXISTS public.saved_workouts;

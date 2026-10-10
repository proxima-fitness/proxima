SELECT nth_week, hevy_folder_id, hevy_routine_ids, completed_at
FROM public.program_hevy_week_links
WHERE program_id = 13 ORDER BY nth_week;
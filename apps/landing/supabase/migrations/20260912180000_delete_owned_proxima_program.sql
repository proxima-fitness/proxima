-- Owner **Delete** of a **Proxima program** is a PostgREST DELETE on
-- `programs` (RLS: auth.uid() = user_id). Join rows and leftover child
-- tables must not block that delete. FK referential actions are exempt
-- from RLS, so ON DELETE CASCADE drops other lifters' program_subscribers
-- rows (and program_history / reports) without a SECURITY DEFINER RPC.

ALTER TABLE public.program_subscribers
    DROP CONSTRAINT program_subscribers_program_id_fkey;

ALTER TABLE public.program_subscribers
    ADD CONSTRAINT program_subscribers_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs (id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.program_history
    DROP CONSTRAINT program_history_program_id_fkey;

ALTER TABLE public.program_history
    ADD CONSTRAINT program_history_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs (id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.reports
    DROP CONSTRAINT reports_program_id_fkey;

ALTER TABLE public.reports
    ADD CONSTRAINT reports_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs (id)
    ON UPDATE CASCADE ON DELETE CASCADE;

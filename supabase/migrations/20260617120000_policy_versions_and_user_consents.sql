-- policy_versions registry and per-user consent records (clickwrap legal acceptance)

CREATE TABLE public.policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('terms_of_use', 'privacy_policy')),
  version_label text NOT NULL,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX policy_versions_document_type_effective_at_idx
  ON public.policy_versions (document_type, effective_at DESC);

CREATE TABLE public.user_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  terms_version_id uuid NOT NULL REFERENCES public.policy_versions (id),
  privacy_version_id uuid NOT NULL REFERENCES public.policy_versions (id),
  legal_accepted_at timestamptz NOT NULL,
  platform_improvement_opt_in boolean NOT NULL DEFAULT false,
  platform_improvement_opt_in_at timestamptz,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read policy versions"
  ON public.policy_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read own consents"
  ON public.user_consents
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.user_consents
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own consents"
  ON public.user_consents
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

INSERT INTO public.policy_versions (document_type, version_label, effective_at)
VALUES
  ('terms_of_use', '2026-06-17', timestamptz '2026-06-17 00:00:00+00'),
  ('privacy_policy', '2026-06-17', timestamptz '2026-06-17 00:00:00+00');

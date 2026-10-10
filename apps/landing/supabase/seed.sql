-- SPDX-License-Identifier: AGPL-3.0-only

-- Seed data required by the application (idempotent).

INSERT INTO public.policy_versions (document_type, version_label, effective_at)
VALUES
  ('terms_of_use', '2026-06-17', timestamptz '2026-06-17 00:00:00+00'),
  ('privacy_policy', '2026-06-17', timestamptz '2026-06-17 00:00:00+00')
ON CONFLICT DO NOTHING;

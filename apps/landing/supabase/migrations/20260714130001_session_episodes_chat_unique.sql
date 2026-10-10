-- SPDX-License-Identifier: AGPL-3.0-only

CREATE UNIQUE INDEX session_episodes_chat_id_unique
  ON public.session_episodes (chat_id)
  WHERE chat_id IS NOT NULL;

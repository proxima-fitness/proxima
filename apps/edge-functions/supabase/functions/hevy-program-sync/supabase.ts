// SPDX-License-Identifier: AGPL-3.0-only

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"] as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// File: supabase/functions/add-contact/index.ts
import { serve } from "https://deno.land/std@0.171.0/http/server.ts";

type TPayload = {
  type: string;
  table: string;
  record: {
    id: string;
    bio: string | null;
    email: string;
    username: string | null;
    last_name: string | null;
    created_at: string;
    first_name: string | null;
    textsearchable_index_col: string;
  }
  schema: string;
  old_record: null;
}

serve(async (req) => {

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  const payload: TPayload = await req.json();

  const email = payload.record.email;
  const first_name = payload?.record?.first_name ?? "";
  const last_name = payload?.record?.last_name ?? "";

  const result = await fetch("https://api.resend.com/audiences/ff2ad8b1-1a66-41d6-873b-932fede257bf/contacts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      firstName: first_name,
      lastName: last_name,
    }),
  });

  const data = await result.json();

  if (!result.ok) {
    console.error("Resend error:", data);
    return new Response(JSON.stringify({ error: data }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create admin user
  const { data: user, error: createError } = await supabase.auth.admin.createUser({
    email: "rsanchez@pycseca.com",
    password: "Pycseca2026",
    email_confirm: true,
  });

  if (createError) {
    // Check if user already exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existing = users?.find((u: any) => u.email === "rsanchez@pycseca.com");
    if (existing) {
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: existing.id, role: "admin" },
        { onConflict: "user_id,role" }
      );
      return new Response(JSON.stringify({ ok: true, message: "User exists, role ensured", roleErr: roleErr?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: roleErr } = await supabase.from("user_roles").insert({
    user_id: user.user.id,
    role: "admin",
  });

  return new Response(JSON.stringify({ ok: true, userId: user.user.id, roleErr: roleErr?.message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

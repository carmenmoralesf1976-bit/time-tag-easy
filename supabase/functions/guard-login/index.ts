import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { badge_id, pin } = await req.json();

    if (!badge_id || !pin) {
      return new Response(
        JSON.stringify({ error: "Se requieren badge_id y pin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Validate PIN against guard_pins table
    const { data: guardPin, error: pinError } = await supabaseAdmin
      .from("guard_pins")
      .select("badge_id, pin")
      .eq("badge_id", badge_id)
      .single();

    if (pinError || !guardPin) {
      return new Response(
        JSON.stringify({ error: "Nº de placa no encontrado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (guardPin.pin !== pin) {
      return new Response(
        JSON.stringify({ error: "PIN incorrecto" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or find the auth user for this guard
    const guardEmail = `guard_${badge_id}@pycseca.local`;
    const guardPassword = `guard_secure_${badge_id}_${pin}`;

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: guardEmail,
      password: guardPassword,
    });

    if (signInData?.session) {
      return new Response(
        JSON.stringify({ session: signInData.session }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User doesn't exist, create them
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: guardEmail,
      password: guardPassword,
      email_confirm: true,
      user_metadata: { badge_id, role: "guard" },
    });

    if (createError || !newUser.user) {
      return new Response(
        JSON.stringify({ error: "Error al crear usuario" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign guard role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "guard",
    });

    // Sign in the newly created user
    const { data: newSignIn, error: newSignInError } = await supabaseAdmin.auth.signInWithPassword({
      email: guardEmail,
      password: guardPassword,
    });

    if (newSignInError || !newSignIn.session) {
      return new Response(
        JSON.stringify({ error: "Error al iniciar sesión" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ session: newSignIn.session }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSignupStatus } from "@/lib/auth-feedback";

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    redirect(
      "/signup?error=" +
        encodeURIComponent(
          "Ingresa un correo válido y una contraseña de al menos 8 caracteres.",
        ),
    );
  }

  const supabase = await createClient();

  const redirectTo = getSiteUrl();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  const signupStatus = getSignupStatus({
    error,
    user: data.user,
  });

  if (signupStatus === "account_exists") {
    redirect(
      "/signup?message=" +
        encodeURIComponent(
          "Este correo ya está registrado.",
        ) +
        "&status=account_exists",
    );
  }

  if (signupStatus === "error") {
    redirect(
      "/signup?error=" +
        encodeURIComponent("No pudimos crear la cuenta. Intenta nuevamente."),
    );
  }

  redirect(
    "/signup?message=" +
      encodeURIComponent(
        "Cuenta creada. Revisa tu correo para confirmar tu cuenta.",
      ) +
      "&status=account_created",
  );
}

export async function resendSignupConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("Ingresa tu correo para reenviar la verificación.") +
        "&status=account_exists",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    console.error("SIGNUP_CONFIRMATION_RESEND_ERROR", error);
    redirect(
      "/signup?error=" +
        encodeURIComponent(
          "No pudimos reenviar el correo. Espera unos minutos e inténtalo nuevamente.",
        ) +
        "&status=account_exists",
    );
  }

  redirect(
    "/signup?message=" +
      encodeURIComponent(
        "Si la cuenta necesita verificación, enviamos un nuevo correo. Revisa tu bandeja de entrada y spam.",
      ) +
      "&status=verification_sent",
  );
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Ingresa tu correo y contraseña."),
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      "/login?error=" +
        encodeURIComponent("Correo o contraseña incorrectos."),
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut({
    scope: "local",
  });

  revalidatePath("/", "layout");
  redirect("/login");
}
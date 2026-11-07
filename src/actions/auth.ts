"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSignupStatus } from "@/lib/auth-feedback";

export type LoginFormState = {
  error?: string;
};

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

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("Ingresa un correo válido."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    console.error("PASSWORD_RESET_REQUEST_ERROR", error);
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent(
          "No pudimos enviar el enlace. Inténtalo nuevamente en unos minutos.",
        ),
    );
  }

  redirect(
    "/forgot-password?message=" +
      encodeURIComponent(
        "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.",
      ),
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 8) {
    redirect(
      "/reset-password?error=" +
        encodeURIComponent("La contraseña debe tener al menos 8 caracteres."),
    );
  }

  if (password !== confirmation) {
    redirect(
      "/reset-password?error=" +
        encodeURIComponent("Las contraseñas no coinciden."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("PASSWORD_UPDATE_ERROR", error);
    redirect(
      "/reset-password?error=" +
        encodeURIComponent(
          "No pudimos actualizar la contraseña. Solicita un nuevo enlace.",
        ),
    );
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("Contraseña actualizada. Ya puedes iniciar sesión."),
  );
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut({
    scope: "local",
  });

  revalidatePath("/", "layout");
  redirect("/login");
}
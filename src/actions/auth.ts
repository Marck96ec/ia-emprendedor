"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

async function getOrigin() {
  const headersList = await headers();

  return (
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    redirect(
      "/signup?error=" +
        encodeURIComponent("No pudimos crear la cuenta. Intenta nuevamente."),
    );
  }

  redirect(
    "/signup?message=" +
      encodeURIComponent("Revisa tu correo para confirmar tu cuenta."),
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
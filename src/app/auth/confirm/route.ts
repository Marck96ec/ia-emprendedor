import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextPath = searchParams.get("next");

  const redirectTo = request.nextUrl.clone();
  const isRecoveryFlow =
    nextPath === "/reset-password" || type === "recovery";

  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");
  redirectTo.searchParams.delete("error");
  redirectTo.searchParams.delete("error_code");
  redirectTo.searchParams.delete("error_description");

  if (code || (tokenHash && type)) {
    const supabase = await createClient();

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          type: type as EmailOtpType,
          token_hash: tokenHash as string,
        });

    if (!error) {
      redirectTo.pathname =
        isRecoveryFlow
          ? "/reset-password"
          : "/dashboard";

      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = isRecoveryFlow ? "/forgot-password" : "/login";
  redirectTo.searchParams.set(
    "error",
    isRecoveryFlow
      ? "El enlace expiró o ya fue utilizado. Solicita uno nuevo para recuperar tu contraseña."
      : "El enlace de confirmación no es válido o ha expirado.",
  );

  return NextResponse.redirect(redirectTo);
}
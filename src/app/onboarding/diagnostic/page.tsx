import { redirect } from "next/navigation";

import { DiagnosticWizard } from "@/components/diagnostic-wizard";
import { createClient } from "@/lib/supabase/server";

type DiagnosticPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DiagnosticPage({
  searchParams,
}: DiagnosticPageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name")
      .eq("owner_id", userId)
      .maybeSingle();

  if (businessError) {
    throw new Error("No pudimos cargar el negocio");
  }

  if (!business) {
    redirect("/onboarding/business");
  }

  const { data: diagnostic, error: diagnosticError } =
    await supabase
      .from("business_diagnostics")
      .select("id")
      .eq("business_id", business.id)
      .maybeSingle();

  if (diagnosticError) {
    throw new Error("No pudimos cargar el diagnóstico");
  }

  if (diagnostic) {
    redirect("/dashboard");
  }

  return <DiagnosticWizard businessName={business.name} error={error} />;
}